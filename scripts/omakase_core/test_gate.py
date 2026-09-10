#!/usr/bin/env python3
"""Prove the phase-2 gate behaves as written, while there is still no real data.

A pre-registered criterion has to be demonstrably correct *before* the labels arrive,
otherwise the first time anyone checks it is the first time it matters. These cases use
synthetic verdicts so every branch is exercised now.

    python3 test_gate.py      # rc 0 = the gate rules the way its docstring says
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from omakase_core import gate as G  # noqa: E402

STEPS_A = [{"seq": 1, "app_name": "STARApp"}, {"seq": 2, "app_name": "FeatureCountsApp"}]
STEPS_B = [{"seq": 1, "app_name": "STARApp"}, {"seq": 2, "app_name": "KallistoApp"}]


def verdicts(accepted: int, edited: int = 0, rejected: int = 0):
    """A synthetic verdict table, in the shape `Store.verdicts()` returns."""
    rows = []
    cid = 0
    for _ in range(accepted):
        cid += 1
        rows.append({"candidate_id": cid, "verdict": "ACCEPTED",
                     "proposed_steps_json": json.dumps(STEPS_A),
                     "final_steps_json": json.dumps(STEPS_A)})
    for _ in range(edited):
        cid += 1
        rows.append({"candidate_id": cid, "verdict": "EDITED",
                     "proposed_steps_json": json.dumps(STEPS_A),
                     "final_steps_json": json.dumps(STEPS_B)})
    for _ in range(rejected):
        cid += 1
        rows.append({"candidate_id": cid, "verdict": "REJECTED",
                     "proposed_steps_json": json.dumps(STEPS_A),
                     "final_steps_json": None})
    return rows


CASES = []


def case(fn):
    CASES.append(fn)
    return fn


@case
def too_few_labels_refuses_to_rule_however_good_the_rate():
    r = G.score(verdicts(accepted=20))          # 100% accepted, but only 20 labels
    assert r["status"] == G.NOT_YET, r
    assert r["exact_rate"] == 1.0
    return "20/20 accepted is still NOT_YET below the 30-label floor"


@case
def a_clear_improvement_passes():
    r = G.score(verdicts(accepted=40, edited=60))   # 40%
    assert r["status"] == G.PASS, r
    assert r["exact_lower_95"] > G.BASELINE_WEIGHTED, r
    return f"40/100 passes, lower bound {r['exact_lower_95']:.1%} > 17%"


@case
def no_better_than_the_baseline_fails():
    r = G.score(verdicts(accepted=10, edited=90))   # 10%, below 17%
    assert r["status"] == G.FAIL, r
    assert "would do as well or better" in r["why"]
    return "10/100 FAILs: the historical most-common chain would do as well"


@case
def a_real_but_unprovable_effect_is_not_yet_not_a_pass():
    r = G.score(verdicts(accepted=20, edited=80))   # 20% > 17%, but the bound is not
    assert r["status"] == G.NOT_YET, r
    assert r["exact_rate"] > G.BASELINE_WEIGHTED
    assert r["exact_lower_95"] <= G.BASELINE_WEIGHTED
    return (f"20/100 = 20% beats 17% on the point estimate but the lower bound is "
            f"{r['exact_lower_95']:.1%}; NOT_YET, not PASS")


@case
def an_edited_verdict_is_a_miss_even_though_it_is_the_best_record():
    r = G.score(verdicts(accepted=0, edited=40))
    assert r["exact_hits"] == 0, r
    # ...but the graded measure still sees the half-right proposal
    assert 0.4 < r["mean_app_f1"] < 0.6, r["mean_app_f1"]
    return f"EDITED counts as a miss; app F1 still records {r['mean_app_f1']:.2f} of it"


@case
def a_rejected_verdict_scores_zero_on_both():
    r = G.score(verdicts(accepted=0, rejected=35))
    assert r["exact_hits"] == 0 and r["mean_app_f1"] == 0.0, r
    assert r["status"] == G.FAIL, r
    return "REJECTED is a miss on the strict metric and on the graded one"


@case
def the_baseline_and_the_floor_are_the_pre_registered_ones():
    assert G.BASELINE_WEIGHTED == 0.17, G.BASELINE_WEIGHTED
    assert G.BASELINE_NGS == 0.08, G.BASELINE_NGS
    assert G.MIN_LABELS == 30, G.MIN_LABELS
    return "baseline 17% / NGS 8% / floor 30 labels, as fixed on 2026-09-10"


def main() -> int:
    ok = True
    for fn in CASES:
        try:
            print(f"  PASS  {fn.__name__}\n        {fn()}")
        except AssertionError as exc:
            ok = False
            print(f"  FAIL  {fn.__name__}\n        {exc}")
        except Exception as exc:  # noqa: BLE001
            ok = False
            print(f"  ERROR {fn.__name__}\n        {type(exc).__name__}: {exc}")
    print(f"\n{len(CASES)} cases, {'all pass' if ok else 'FAILURES ABOVE'}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
