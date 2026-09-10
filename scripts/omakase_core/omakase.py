#!/usr/bin/env python3
"""OMAKASE prototype — command line.

The first vertical slice of design v0.3 plus `docs/omakase-prototype-design-delta.md`:

    order event  ->  candidate  ->  [FIXED recipe]  ->  proposal  ->  human approves
                 ->  chain runner, one step at a time  ->  done or halted

Nothing here uses a model. Per design decision D4 the trigger, the timer and every state
transition are ordinary code.

    python -m omakase_core.omakase ingest  --event ~/.omakase/events/order_40917.json \\
                                           --dataset 9
    python -m omakase_core.omakase show
    python -m omakase_core.omakase show    --candidate 1
    python -m omakase_core.omakase approve --candidate 1 --actor masaomi
    python -m omakase_core.omakase run     --candidate 1 --dry-run
    python -m omakase_core.omakase run     --candidate 1

Approval is explicit and human, every time. The deadline-driven auto-approval of design
v0.3 §10 is deliberately not in this slice.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

if __package__ in (None, ""):  # allow `python omakase.py` as well as `-m`
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    __package__ = "omakase_core"

from . import recipes, store as S           # noqa: E402
from .runner import ChainRunner             # noqa: E402
from .sushi import SushiClient              # noqa: E402

DEFAULT_STORE = Path.home() / ".omakase" / "omakase.sqlite3"
DEFAULT_EVENTS = Path.home() / ".omakase" / "events"
DEFAULT_BASE_URL = "http://fgcz-h-083.fgcz-net.unizh.ch:3010"
MCP_JSON = Path("/srv/sushi/masa_test_new_sushi_20260527/.mcp.json")

# Order fields carried into the candidate. The allow-list of design v0.3 §3: billing,
# requester and order label are not among them, and never reach the store.
KEPT_ORDER_FIELDS = [
    "id", "status", "statusmodified", "statusmodifiedby", "project", "servicetype",
    "technology", "sequencingapplication", "instrument", "libraryprotocol",
    "numberofsamples", "countsamples", "countdatasets",
]


def token() -> str:
    """The backend bearer. Env first, then the MCP config, so no third copy exists."""
    tok = os.environ.get("NEWSUSHI_TOKEN_083")
    if tok:
        return tok
    try:
        return json.load(MCP_JSON.open())["mcpServers"]["sushi-chain"]["env"]["NEWSUSHI_TOKEN_083"]
    except Exception as exc:  # noqa: BLE001
        raise SystemExit(
            f"no backend token: set NEWSUSHI_TOKEN_083 or make {MCP_JSON} readable ({exc})")


# ------------------------------------------------------------------------ commands


def cmd_ingest(args, st: S.Store) -> int:
    event = json.load(Path(args.event).open(encoding="utf-8"))
    order = event.get("order") or {}
    order_id = int(order["id"])

    recipe = recipes.select(order, args.recipe)
    cid, created = st.upsert_candidate(
        order_id=order_id,
        input_dataset_id=args.dataset,
        recipe_id=recipe["id"],
        recipe_version=str(recipe["version"]),
        project_number=(order.get("project") or {}).get("id"),
    )
    if not created:
        print(f"candidate {cid} already exists for order {order_id} / dataset "
              f"{args.dataset} / {recipe['id']}@{recipe['version']} — nothing to do")
        return 0

    st.set_order_params(cid, {k: order.get(k) for k in KEPT_ORDER_FIELDS if k in order})
    st.set_state(cid, S.PARAMS_OK, actor="omakase-core",
                 reason=f"allow-listed order fields recorded ({len(order)} available)")
    st.set_steps(cid, recipe["steps"])
    st.set_state(cid, S.PROPOSED, actor="omakase-core",
                 reason=f"recipe {recipe['id']}@{recipe['version']}, "
                        f"{len(recipe['steps'])} steps")
    print(f"candidate {cid}: order {order_id}, dataset {args.dataset}, "
          f"recipe {recipe['id']}@{recipe['version']} -> PROPOSED")
    _print_candidate(st, cid)
    return 0


def _print_candidate(st: S.Store, cid: int) -> None:
    cand = st.candidate(cid)
    print(f"\ncandidate {cid}  state={cand['state']}  order={cand['order_id']}  "
          f"dataset={cand['input_dataset_id']}  "
          f"recipe={cand['recipe_id']}@{cand['recipe_version']}")
    print("  proposed chain:")
    for step in st.steps(cid):
        dep = step["depends_on_seq"]
        src = f"output of step {dep}" if dep else f"dataset {cand['input_dataset_id']}"
        sub = st.latest_submission(cid, step["seq"])
        state = f"{sub['state']} (attempt {sub['attempt']})" if sub else "not submitted"
        print(f"    {step['seq']}. {step['app_name']:<16} on {src:<20} "
              f"{json.dumps(step['parameters'], sort_keys=True)}  [{state}]")
    subs = st.submissions(cid)
    if subs:
        print("  submissions:")
        for s in subs:
            print(f"    step {s['step_seq']} attempt {s['attempt']}: {s['state']:<10} "
                  f"jobs={s['sushi_job_ids_json']} out_ds={s['output_dataset_id']}")
    print("  transitions:")
    for t in st.transitions(cid):
        print(f"    {t['at']}  {str(t['from_state']):<12} -> {t['to_state']:<12} "
              f"{t['actor']:<12} {t['reason'] or ''}")


def cmd_show(args, st: S.Store) -> int:
    if args.candidate:
        _print_candidate(st, args.candidate)
        return 0
    rows = st.candidates(args.state)
    if not rows:
        print("no candidates")
        return 0
    print(f"{'id':>4}  {'state':<14} {'order':>7} {'dataset':>8}  recipe")
    for r in rows:
        print(f"{r['id']:>4}  {r['state']:<14} {r['order_id']:>7} "
              f"{r['input_dataset_id']:>8}  {r['recipe_id']}@{r['recipe_version']}")
    return 0


def cmd_approve(args, st: S.Store) -> int:
    cand = st.candidate(args.candidate)
    if cand is None:
        raise SystemExit(f"no candidate {args.candidate}")
    if cand["state"] != S.PROPOSED:
        raise SystemExit(f"candidate {args.candidate} is {cand['state']}, not PROPOSED")
    st.set_state(args.candidate, S.APPROVED, actor=args.actor,
                 reason=args.reason or "approved by a human")
    print(f"candidate {args.candidate} APPROVED by {args.actor}")
    return 0


def cmd_run(args, st: S.Store) -> int:
    client = SushiClient(args.base_url, token(), dry_run=args.dry_run)
    runner = ChainRunner(st, client, max_retries=args.max_retries)
    cid = args.candidate
    while True:
        state = runner.tick(cid)
        if state in S.TERMINAL_CANDIDATE_STATES:
            print(f"candidate {cid} finished in state {state}")
            _print_candidate(st, cid)
            return 0 if state == S.DONE else 2
        if args.once or args.dry_run:
            print(f"candidate {cid} is {state}")
            return 0
        time.sleep(args.poll)


def cmd_recipes(args, st: S.Store) -> int:
    for rid in recipes.available():
        r = recipes.load(rid)
        print(f"{r['id']}@{r['version']}  {len(r['steps'])} steps: "
              + " -> ".join(s["app_name"] for s in r["steps"]))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--store", type=Path, default=DEFAULT_STORE)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("ingest", help="turn an order event into a proposed candidate")
    p.add_argument("--event", required=True, help="a JSON file from omakase_order_watch")
    p.add_argument("--dataset", type=int, required=True,
                   help="the SUSHI input dataset id. Resolving it from the order is not "
                        "in this slice, so it is given explicitly")
    p.add_argument("--recipe", default=None)
    p.set_defaults(fn=cmd_ingest)

    p = sub.add_parser("show")
    p.add_argument("--candidate", type=int)
    p.add_argument("--state")
    p.set_defaults(fn=cmd_show)

    p = sub.add_parser("approve", help="the human gate; nothing runs before it")
    p.add_argument("--candidate", type=int, required=True)
    p.add_argument("--actor", required=True)
    p.add_argument("--reason")
    p.set_defaults(fn=cmd_approve)

    p = sub.add_parser("run", help="drive the chain, one step at a time")
    p.add_argument("--candidate", type=int, required=True)
    p.add_argument("--base-url", default=DEFAULT_BASE_URL)
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--once", action="store_true", help="one tick, then exit")
    p.add_argument("--poll", type=int, default=60)
    p.add_argument("--max-retries", type=int, default=1)
    p.set_defaults(fn=cmd_run)

    p = sub.add_parser("recipes")
    p.set_defaults(fn=cmd_recipes)

    args = ap.parse_args()
    st = S.Store(args.store)
    try:
        return args.fn(args, st)
    finally:
        st.close()


if __name__ == "__main__":
    sys.exit(main())
