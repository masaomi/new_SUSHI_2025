"""Phase 2 — the pre-registered gate that decides whether a model is allowed in at all.

**Written 2026-09-10, before any label existed.** That is the point of it. A criterion
written after looking at the accumulated data is not a criterion; it is a threshold placed
wherever the data happens to sit. Everything below — the baseline, the metric, the
required confidence — was fixed while the verdict table was empty, and changing any of it
later is a decision someone has to make deliberately and record.

## The baseline this must beat

Measured on the production SUSHI database on 2026-09-10, over the 426 orders in 12 months
that received analysis beyond routine QC:

    proposing the historically most common chain for the service type is right
        17% of the time weighted (71/421), and 8% for High Throughput Sequencing (NGS)

That is the null model: frequency only, no learning, no model. Anything OMAKASE does has
to beat it, or it is an expensive way to be equally wrong.

## The metric

`exact` — the proposal was accepted **unchanged**. Binary, strict, and the thing the gate
is decided on.

Two things are deliberately NOT the metric. An `EDITED` verdict is a miss even though the
edit is the most valuable record in the table. And `app_f1` — how much of the final chain
the proposal got right — is reported because it says something useful when there are only
a handful of labels, but it is not the gate: a proposal that gets two apps out of three
right still cost a person the work of fixing it.

## How many labels this needs, computed 2026-09-10

Using a Wilson lower bound at 95%, and the measured supply of 426 labelled orders a year
(35.5 a month):

    if the true accuracy is   labels needed   at 35.5/month
                        25%             100        ~3 months
                        35%              30        ~1 month
                        50%              30        ~3 weeks

If OMAKASE is only a little better than 17%, no reachable number of labels will prove it —
and that is the correct answer, not a failure of the test. Per service type is far slower:
NGS supplies 14.5 labels a month, so its own gate needs about seven months; Spatial
supplies 2.7 a month and will not have one.

So the gate is evaluated **globally first**. A per-service-type verdict is reported when
that type has enough labels of its own, and is silent otherwise rather than guessing.
"""
from __future__ import annotations

import json
from math import sqrt

# --- pre-registered on 2026-09-10, before any verdict existed -----------------
BASELINE_WEIGHTED = 0.17          # 71/421 orders, production, 12 months
BASELINE_NGS = 0.08               # 14/174
MIN_LABELS = 30                   # below this, refuse to render a verdict at all
CONFIDENCE_Z = 1.96               # 95%
# -----------------------------------------------------------------------------

PASS = "PASS"
NOT_YET = "NOT_YET"
FAIL = "FAIL"


def wilson_lower(hits: int, n: int, z: float = CONFIDENCE_Z) -> float:
    """Lower end of the Wilson interval. Conservative on purpose and at small n.

    A bare hit rate on 12 labels can read 33% and mean nothing; the lower bound is what
    stops that being called a pass.
    """
    if n == 0:
        return 0.0
    p = hits / n
    denom = 1 + z * z / n
    centre = p + z * z / (2 * n)
    margin = z * sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return max(0.0, (centre - margin) / denom)


def app_set(steps) -> set[str]:
    return {s.get("app_name") for s in (steps or []) if s.get("app_name")}


def app_f1(proposed, final) -> float:
    """How much of the chain the human kept. Context, never the gate."""
    p, f = app_set(proposed), app_set(final)
    if not p and not f:
        return 1.0
    if not p or not f:
        return 0.0
    hit = len(p & f)
    if hit == 0:
        return 0.0
    precision, recall = hit / len(p), hit / len(f)
    return 2 * precision * recall / (precision + recall)


def score(verdicts, service_type_of=None, baseline: float = BASELINE_WEIGHTED) -> dict:
    """Turn the accumulated verdicts into a verdict on OMAKASE itself."""
    rows = []
    for v in verdicts:
        proposed = json.loads(v["proposed_steps_json"])
        final = json.loads(v["final_steps_json"]) if v["final_steps_json"] else []
        rows.append({
            "candidate_id": v["candidate_id"],
            "verdict": v["verdict"],
            "exact": v["verdict"] == "ACCEPTED",
            "app_f1": app_f1(proposed, final) if v["verdict"] != "REJECTED" else 0.0,
            "service_type": (service_type_of or {}).get(v["candidate_id"]),
        })

    n = len(rows)
    hits = sum(1 for r in rows if r["exact"])
    lower = wilson_lower(hits, n)
    mean_f1 = sum(r["app_f1"] for r in rows) / n if n else 0.0

    if n < MIN_LABELS:
        status, why = NOT_YET, (
            f"{n} labels, and the gate refuses to rule below {MIN_LABELS}. "
            f"At the measured supply of 35.5 labelled orders a month that is about "
            f"{max(0, MIN_LABELS - n) / 35.5:.1f} more months.")
    elif lower > baseline:
        status, why = PASS, (
            f"{hits}/{n} accepted unchanged; the 95% lower bound {lower:.1%} is above the "
            f"pre-registered baseline {baseline:.0%}. A model may now be considered for "
            f"ranking -- with its probabilities still counted, not asserted.")
    elif hits / n > baseline:
        status, why = NOT_YET, (
            f"{hits}/{n} = {hits / n:.1%} is above the {baseline:.0%} baseline, but the "
            f"95% lower bound is {lower:.1%}, which is not. More labels, or a real effect "
            f"that is too small to prove.")
    else:
        status, why = FAIL, (
            f"{hits}/{n} = {hits / n:.1%} does not beat the {baseline:.0%} baseline. "
            f"Proposing the historical most-common chain would do as well or better. "
            f"Adding a model would not fix this; the recipes would.")

    by_verdict = {}
    for r in rows:
        by_verdict[r["verdict"]] = by_verdict.get(r["verdict"], 0) + 1

    return {
        "status": status, "why": why,
        "labels": n, "exact_hits": hits,
        "exact_rate": hits / n if n else 0.0,
        "exact_lower_95": lower,
        "baseline": baseline,
        "mean_app_f1": mean_f1,
        "by_verdict": by_verdict,
        "pre_registered": "2026-09-10, before any verdict existed",
    }


def describe(result: dict) -> str:
    out = [
        f"gate: {result['status']}",
        f"  {result['why']}",
        "",
        f"  labels                  {result['labels']}",
        f"  accepted unchanged      {result['exact_hits']}/{result['labels']} "
        f"= {result['exact_rate']:.1%}",
        f"  95% lower bound         {result['exact_lower_95']:.1%}",
        f"  baseline to beat        {result['baseline']:.0%}  "
        f"(measured 2026-09-10, production, 12 months)",
        f"  mean app F1             {result['mean_app_f1']:.2f}   "
        f"(context only, not the gate)",
        f"  verdicts                " + ", ".join(
            f"{k}={v}" for k, v in sorted(result["by_verdict"].items())) or "none",
        "",
        f"  criterion pre-registered {result['pre_registered']}",
    ]
    return "\n".join(out)
