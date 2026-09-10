"""How often has this shape actually been run? Counted, never guessed.

A proposal has to say how much to trust it. That number must come from **counting**, with
its denominator shown, and never from a model. A model asked for a probability produces a
confident-looking figure that nothing has calibrated, and on this data that would be
actively harmful: for High Throughput Sequencing (NGS) the most common analysis shape
covers 8% of orders, so a model announcing "72% confident" would be believed and wrong.

Measured on production 2026-09-10, over the 426 orders in 12 months that received analysis
beyond routine QC:

    service type                       orders  distinct shapes  top-1
    High Throughput Sequencing (NGS)      174              111     8%
    Ready-made Libraries Sequencing       132               66    20%
    Single Cell Sequencing                 59               28    20%
    Spatial Gene Expression                32               13    44%
    Genome Informatics                     19               18    11%
    weighted                              421              ---    17%

So the honest output of this module is usually "this shape has been run 15 times out of
174 orders of this service type", and the honest conclusion is usually that OMAKASE should
abstain. That is the point. Design v0.3 §11 already has the mechanism -- whitelist not
blacklist, low confidence goes to HELD -- and these numbers say the whitelist starts narrow.

The input is the TSV that `scripts/omakase_history_audit/history_audit.py` produces.
Without it, `lookup()` returns None and the proposal says it has no evidence, which is
better than inventing some.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

# Routine delivery QC. Present on 534 of 960 orders with nothing else, so leaving it in
# makes every concentration figure look far better than it is.
QC_APPS = {"FastqcApp", "FastqScreenApp", "Fastqc10xApp", "FastqScreen10xApp"}


def shape(steps: list[dict], drop_qc: bool = True) -> str:
    """`{A,B} => {C}` -- braces are one level, so parallel is not confused with sequential.

    Apps with the same `depends_on_seq` run side by side. Writing them with `->` was a real
    mistake in the first version of the history report: 431 orders that ran FastqScreen and
    Fastqc *in parallel on the delivered data* were printed as if one fed the other.
    """
    levels: dict[Any, set[str]] = defaultdict(set)
    for step in steps:
        app = step.get("app_name") or ""
        if drop_qc and app in QC_APPS:
            continue
        levels[step.get("depends_on_seq")].add(app)
    ordered = sorted(levels, key=lambda d: (d is not None, d))
    return " => ".join("{" + ",".join(sorted(levels[d])) + "}" for d in ordered if levels[d])


def _shape_from_history(apps: list[tuple[int, str]], drop_qc: bool = True) -> str:
    levels: dict[int, set[str]] = defaultdict(set)
    for depth, app in apps:
        if drop_qc and app in QC_APPS:
            continue
        levels[depth].add(app)
    return " => ".join("{" + ",".join(sorted(levels[d])) + "}"
                       for d in sorted(levels) if levels[d])


class History:
    """Counted shapes per service type.

    Loads either the raw audit TSV (which has no service type, so everything lands under
    one bucket) or a prebuilt JSON written by `build()`. The JSON exists so that proposing
    does not need a B-Fabric round trip per candidate: the counting is done once, offline,
    and the proposal only reads it.
    """

    def __init__(self, tsv_path: str | Path, service_type_of: dict[int, str] | None = None):
        self.by_service: dict[str, Counter] = defaultdict(Counter)
        self.total_orders = 0
        if str(tsv_path).endswith(".json"):
            import json as _json
            path = Path(tsv_path)
            if not path.exists():
                return
            data = _json.loads(path.read_text(encoding="utf-8"))
            self.names = data.get("service_type_names", {})
            for st, counts in data.get("by_service", {}).items():
                self.by_service[str(st)] = Counter(counts)
                self.total_orders += sum(counts.values())
            return
        self.names = {}
        by_order: dict[int, list[tuple[int, str]]] = defaultdict(list)
        path = Path(tsv_path)
        if not path.exists():
            return
        with path.open(encoding="utf-8") as fh:
            for line in fh:
                parts = line.rstrip("\n").split("\t")
                if len(parts) < 3 or not parts[0].strip().isdigit():
                    continue
                by_order[int(parts[0])].append((int(parts[1]), parts[2].strip()))
        for order_id, apps in by_order.items():
            sh = _shape_from_history(apps)
            if not sh:
                continue          # QC only; nothing to learn about analysis choice
            st = (service_type_of or {}).get(order_id, "(service type unknown)")
            self.by_service[st][sh] += 1
            self.total_orders += 1

    def lookup(self, service_type, proposed_shape: str) -> dict | None:
        """How often this exact shape was run for this service type. None if unknown.

        Keyed by the B-Fabric service type **id**, not its name: an order record carries
        `{"classname": "servicetype", "id": 164}` and no name, so keying by name meant
        every lookup silently missed and every proposal claimed to have no evidence.
        """
        key = str(service_type)
        counts = self.by_service.get(key)
        if not counts:
            return None
        n = sum(counts.values())
        hits = counts.get(proposed_shape, 0)
        top_shape, top_n = counts.most_common(1)[0]
        return {
            "service_type": self.names.get(key, key),
            "service_type_id": key,
            "proposed_shape": proposed_shape,
            # Always a fraction with its denominator, never a bare percentage.
            "matched": f"{hits}/{n}",
            "matched_share": hits / n,
            "distinct_shapes": len(counts),
            "most_common_shape": top_shape,
            "most_common": f"{top_n}/{n}",
            "most_common_share": top_n / n,
            "source": "counted from execution history; no model involved",
        }


def describe(ev: dict | None) -> str:
    """One line a human can read, that never overstates what was counted."""
    if ev is None:
        return ("no evidence: this service type has no recorded analysis history. "
                "Treat the proposal as unsupported.")
    line = (f"this exact chain was run {ev['matched']} times for "
            f"{ev['service_type']} ({ev['matched_share']:.0%}); "
            f"{ev['distinct_shapes']} distinct chains have been seen, the most common "
            f"covering {ev['most_common']} ({ev['most_common_share']:.0%})")
    if ev["matched_share"] < 0.3:
        line += ". LOW: a person should expect to change this."
    return line


def build(tsv_path: str | Path, out_path: str | Path,
          service_type_of: dict[int, str]) -> dict:
    """Count shapes per service type once, offline, and write them for the proposer.

    Keeping this separate matters for honesty as much as for speed: the numbers a proposal
    shows are a snapshot someone can re-derive and check, not something computed on the fly
    out of view.
    """
    import json as _json
    hist = History(tsv_path, {o: str(v[0]) for o, v in service_type_of.items()})
    payload = {
        "service_type_names": {str(v[0]): v[1] for v in service_type_of.values()},
        "built_at": __import__("datetime").datetime.now().astimezone().isoformat(
            timespec="seconds"),
        "source_tsv": str(tsv_path),
        "orders_counted": hist.total_orders,
        "note": "counted from execution history, QC-only orders excluded; no model involved",
        "by_service": {st: dict(c) for st, c in hist.by_service.items()},
    }
    Path(out_path).write_text(_json.dumps(payload, indent=2, sort_keys=True),
                              encoding="utf-8")
    return payload
