#!/usr/bin/env python3
"""Does execution history predict which pipeline to propose?

Design v0.3 §5 selects a recipe from order metadata with hand-written predicates. On
2026-09-10 a second idea was raised: also use **what was actually run** for similar orders.
That is not in v0.3, and before designing it, it is worth knowing whether the history
carries information at all.

Two questions, and the answers point in opposite directions:

1. **Do multi-App chains even happen?** OMAKASE's premise is that proposing a *chain* is
   the new capability. If most finished orders received exactly one App, the premise is
   weaker than assumed and the first version can be simpler.
2. **Per service type, how concentrated is the distribution of App sequences?** If one
   sequence covers most orders, hand-written rules already capture it and history adds
   nothing -- option (a), history informs the human author. If it is spread out, history
   carries information the rules do not -- option (b), history ranks candidates at run
   time.

Read-only. `SELECT` only against SUSHI, `read` only against B-Fabric. No LLM. Output is
aggregate: service types and App names are institutional controlled vocabulary and are
printed; order ids, project names, sample names and requesters are not.

    # 1. on a node that can reach the SUSHI database (see --sql for the 082 recipe)
    python3 history_audit.py --sql > /tmp/history.sql
    python3 history_audit.py --run --months 12 --tsv /tmp/omakase_history.tsv

    # 2. anywhere with bfabricPy, to join and report
    python3 history_audit.py --tsv /tmp/omakase_history.tsv --env PRODUCTION
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from collections import Counter, defaultdict

# One row per (order, depth, app). Depth 1 is the first App applied to the delivered data,
# depth 2 the App applied to that App's output, and so on -- which is exactly the chain
# OMAKASE would have to propose.
SQL = """SET SESSION max_statement_time=300;
WITH RECURSIVE tree AS (
    SELECT d.id AS root_id, d.order_id, d.id AS ds_id, 0 AS depth
      FROM data_sets d
     WHERE d.order_id IS NOT NULL
       AND (d.sushi_app_name IS NULL OR d.sushi_app_name = '')
       AND d.created_at >= DATE_SUB(CURDATE(), INTERVAL {months} MONTH)
    UNION ALL
    SELECT t.root_id, t.order_id, c.id, t.depth + 1
      FROM tree t
      JOIN data_sets c ON c.parent_id = t.ds_id
     WHERE t.depth < 10
)
SELECT t.order_id, t.depth, d.sushi_app_name
  FROM tree t
  JOIN data_sets d ON d.id = t.ds_id
 WHERE t.depth > 0
   AND d.sushi_app_name IS NOT NULL
   AND d.sushi_app_name <> ''
 ORDER BY t.order_id, t.depth;
"""


def sql_text(months: int) -> str:
    return SQL.format(months=months)


def run_sql(months: int, out_path: str) -> int:
    """Run the query locally. Needs SUSHI_DB_PASSWORD in the environment."""
    pwd = os.environ.get("SUSHI_DB_PASSWORD") or os.environ.get("MYSQL_PWD")
    if not pwd:
        print("set SUSHI_DB_PASSWORD (see /etc/sushi/secret.env) first", file=sys.stderr)
        return 2
    env = dict(os.environ, MYSQL_PWD=pwd)
    cmd = ["mysql", "--socket=/var/run/mysqld/mysqld.sock", "-u",
           os.environ.get("SUSHI_DB_USERNAME", "sushilover"),
           os.environ.get("SUSHI_DB_NAME", "sushi"), "--batch", "--raw"]
    res = subprocess.run(cmd, input=sql_text(months), capture_output=True, text=True, env=env)
    if res.returncode != 0:
        print(res.stderr[:600], file=sys.stderr)
        return res.returncode
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(res.stdout)
    rows = max(0, len(res.stdout.splitlines()) - 1)
    print(f"wrote {rows} rows to {out_path}", file=sys.stderr)
    return 0


def read_tsv(path: str) -> dict[int, list[tuple[int, str]]]:
    """order_id -> [(depth, app), ...]"""
    by_order: dict[int, list[tuple[int, str]]] = defaultdict(list)
    with open(path, encoding="utf-8") as fh:
        header = fh.readline()
        if "order_id" not in header:
            fh.seek(0)
        for line in fh:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 3 or not parts[0].strip():
                continue
            try:
                by_order[int(parts[0])].append((int(parts[1]), parts[2].strip()))
            except ValueError:
                continue
    return by_order


def order_metadata(order_ids, env: str) -> dict[int, dict]:
    """Service type and sequencing application for each order. Read-only B-Fabric."""
    from bfabric import Bfabric
    client = Bfabric.connect(config_file_env=env)
    out: dict[int, dict] = {}
    ids = sorted(order_ids)
    for i in range(0, len(ids), 100):
        chunk = ids[i:i + 100]
        for row in client.read("order", {"id": chunk}, max_results=None):
            out[int(row["id"])] = {
                "servicetype": (row.get("servicetype") or {}).get("id"),
                "sequencingapplication": row.get("sequencingapplication"),
                "status": row.get("status"),
            }
    st_ids = {v["servicetype"] for v in out.values() if v["servicetype"]}
    names = {}
    if st_ids:
        for row in client.read("servicetype", {"id": sorted(st_ids)}, max_results=None):
            names[int(row["id"])] = row.get("name") or f"id={row['id']}"
    for v in out.values():
        v["service_type_name"] = names.get(v["servicetype"], "(unknown)")
    return out


# Apps whose presence is routine delivery QC rather than a chosen analysis. Excluding
# them is the difference between a meaningful concentration number and a misleading one:
# 534 of 960 orders in the 2026-09-10 production run had nothing else.
QC_APPS = {"FastqcApp", "FastqScreenApp", "Fastqc10xApp", "FastqScreen10xApp"}


def shape(apps, drop_qc: bool = False) -> str:
    """`{A,B} => {C}` -- braces are one depth, so parallel and sequential are not confused.

    An earlier version joined everything with `->`, which printed 431 orders that ran
    FastqScreen and Fastqc *side by side on the delivered data* as if one fed the other.
    """
    from collections import defaultdict as _dd
    levels = _dd(set)
    for depth, app in apps:
        if drop_qc and app in QC_APPS:
            continue
        levels[depth].add(app)
    return " => ".join("{" + ",".join(sorted(levels[d])) + "}"
                       for d in sorted(levels) if levels[d])


def report(by_order, meta, min_orders: int = 5) -> None:
    # ---- question 1: does chaining happen at all?
    depth_hist = Counter()
    for apps in by_order.values():
        depth_hist[max(d for d, _ in apps)] += 1
    total = sum(depth_hist.values())
    print("\n=== 1. How deep do real chains go? ===")
    print(f"{'max depth':>10}  {'orders':>7}  {'share':>7}")
    for depth in sorted(depth_hist):
        n = depth_hist[depth]
        print(f"{depth:>10}  {n:>7}  {n / total:>6.1%}")
    multi = sum(n for d, n in depth_hist.items() if d >= 2)
    print(f"\n  orders whose analysis was more than one App deep: "
          f"{multi}/{total} = {multi / total:.1%}")
    print("  (if this is small, proposing a *chain* is a smaller win than assumed)")

    # ---- question 2: is the sequence predictable from the service type?
    seq_by_st: dict[str, Counter] = defaultdict(Counter)
    for oid, apps in by_order.items():
        m = meta.get(oid)
        if not m:
            continue
        seq_by_st[m["service_type_name"]][shape(apps)] += 1

    print("\n=== 2. Is the App sequence predictable from the service type? ===")
    print(f"{'service type':<44} {'orders':>7} {'distinct':>9} {'top-1':>7} {'top-3':>7}")
    rows = sorted(seq_by_st.items(), key=lambda kv: -sum(kv[1].values()))
    shown = skipped = 0
    for st_name, seqs in rows:
        n = sum(seqs.values())
        if n < min_orders:
            skipped += 1
            continue
        shown += 1
        top = seqs.most_common(3)
        top1 = top[0][1] / n
        top3 = sum(c for _, c in top) / n
        print(f"{st_name[:43]:<44} {n:>7} {len(seqs):>9} {top1:>6.0%} {top3:>6.0%}")

    if not shown:
        print(f"  (nothing to show: all {skipped} service type(s) have fewer than "
              f"{min_orders} orders. Not a failure -- lower --min-orders, or run this "
              f"where the history actually lives.)")
    elif skipped:
        print(f"  ({skipped} further service type(s) had fewer than {min_orders} orders "
              f"and are not shown)")

    print("\n=== the most common sequences overall ===")
    everything = Counter()
    for seqs in seq_by_st.values():
        everything.update(seqs)
    for path, n in everything.most_common(12):
        print(f"  {n:>6}  {path}")

    print("\n=== how to read this ===")
    print("  top-1 high (say >70%) for a service type: hand-written rules already capture")
    print("    it, and history is best used as reference material for the human author (a).")
    print("  top-1 low and distinct high: the rules would be guessing, and history carries")
    print("    information worth using to rank candidates at run time (b).")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--sql", action="store_true", help="print the query and exit")
    ap.add_argument("--run", action="store_true", help="run the query here")
    ap.add_argument("--months", type=int, default=12)
    ap.add_argument("--tsv", default="/tmp/omakase_history.tsv")
    ap.add_argument("--env", default="PRODUCTION", choices=["PRODUCTION", "TEST"])
    ap.add_argument("--min-orders", type=int, default=5,
                    help="service types with fewer orders are not shown")
    args = ap.parse_args()

    if args.sql:
        print(sql_text(args.months))
        return 0
    if args.run:
        rc = run_sql(args.months, args.tsv)
        if rc or not os.path.exists(args.tsv):
            return rc

    by_order = read_tsv(args.tsv)
    if not by_order:
        print(f"{args.tsv} has no usable rows", file=sys.stderr)
        return 1
    print(f"{len(by_order)} orders with at least one downstream App", file=sys.stderr)
    meta = order_metadata(by_order.keys(), args.env)
    print(f"{len(meta)} of them resolved in B-Fabric", file=sys.stderr)
    report(by_order, meta, args.min_orders)
    return 0


if __name__ == "__main__":
    sys.exit(main())
