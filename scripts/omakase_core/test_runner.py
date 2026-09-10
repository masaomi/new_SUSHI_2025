#!/usr/bin/env python3
"""Acceptance check for the chain runner. Exit code 0 only if every case passes.

A fake backend, not the real one, because the case that matters cannot be produced on
demand against a cluster: **a step fails for a non-transient reason and the next step is
never submitted.** That is exactly what `afterany` gets wrong in job_manager, so it is the
behaviour the runner exists to provide, and it needs a test that can force it.

The live run on fgcz-h-083 covers the happy path against real data. This covers the paths
a real run will not reach on demand.

    python3 test_runner.py        # rc 0 = the runner behaves as the delta design says
"""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from omakase_core import runner as R              # noqa: E402
from omakase_core import store as S               # noqa: E402

RECIPE_STEPS = [
    {"seq": 1, "app_name": "FlashApp", "depends_on_seq": None,
     "parameters": {"cores": 4, "ram": 15},
     "retry_parameters": {"cores": 4, "ram": 30}},
    {"seq": 2, "app_name": "FastqcApp", "depends_on_seq": 1,
     "parameters": {"cores": 1, "ram": 15}, "retry_parameters": None},
]


class FakeClient:
    """Records every submit, and answers job status from a script the test sets."""

    def __init__(self, outcomes: dict[int, list[str]], applicable=None):
        # outcomes: job_id -> the statuses it returns on successive polls
        self.outcomes = {k: list(v) for k, v in outcomes.items()}
        self.applicable = applicable
        self.submits: list[dict] = []
        self._next_job_id = 100
        self._next_ds_id = 900

    def submittable_app_names(self):
        if self.applicable is None:
            return {"Flash", "Fastqc"}
        return set(self.applicable)

    def submit(self, dataset_id, app_name, parameters, next_dataset_name,
               next_dataset_comment=""):
        self._next_job_id += 1
        self._next_ds_id += 1
        rec = {"dataset_id": dataset_id, "app_name": app_name,
               "parameters": dict(parameters), "job_id": self._next_job_id,
               "output_dataset_id": self._next_ds_id}
        self.submits.append(rec)
        self.outcomes.setdefault(rec["job_id"], ["COMPLETED"])
        return {"job_ids": [rec["job_id"]], "output_dataset_id": rec["output_dataset_id"]}

    def job(self, job_id):
        seq = self.outcomes.get(job_id) or ["COMPLETED"]
        status = seq.pop(0) if len(seq) > 1 else seq[0]
        return {"id": job_id, "status": status, "submit_job_id": 900000 + job_id}


def build(tmp: Path, name: str):
    st = S.Store(tmp / f"{name}.sqlite3")
    cid, created = st.upsert_candidate(42, 9, "flash_then_fastqc", "v1", project_number=35611)
    assert created
    st.set_steps(cid, RECIPE_STEPS)
    st.set_state(cid, S.APPROVED, "test", "approved for the test")
    return st, cid


def drive(runner: R.ChainRunner, cid: int, limit: int = 25) -> str:
    for _ in range(limit):
        state = runner.tick(cid)
        if state in S.TERMINAL_CANDIDATE_STATES:
            return state
    return "DID_NOT_SETTLE"


CASES = []


def case(fn):
    CASES.append(fn)
    return fn


@case
def happy_path_runs_step_2_on_step_1s_output(tmp):
    st, cid = build(tmp, "happy")
    client = FakeClient({})
    state = drive(R.ChainRunner(st, client, log=lambda m: None), cid)
    assert state == S.DONE, state
    assert len(client.submits) == 2, client.submits
    first, second = client.submits
    assert first["app_name"] == "Flash" and first["dataset_id"] == 9
    # what goes on the wire is the submit name, not the class name
    assert second["app_name"] == "Fastqc"
    # The whole point of a chain: step 2 reads step 1's output, not the original dataset.
    assert second["dataset_id"] == first["output_dataset_id"], (first, second)
    return "2 steps, step 2 consumed step 1's output dataset"


@case
def non_transient_failure_halts_and_step_2_is_never_submitted(tmp):
    st, cid = build(tmp, "halt")
    client = FakeClient({101: ["FAILED"]})
    R.is_transient = lambda _sid: (False, "FAILED")      # SLURM says: not transient
    state = drive(R.ChainRunner(st, client, log=lambda m: None), cid)
    assert state == S.CHAIN_HALTED, state
    apps = [s["app_name"] for s in client.submits]
    assert apps == ["Flash"], apps               # <- the acceptance criterion
    return "halted after step 1; Fastqc was never submitted"


@case
def transient_failure_retries_once_with_the_recipes_larger_parameters(tmp):
    st, cid = build(tmp, "retry")
    # job 101 = step 1 attempt 1, dies out of memory. Its retry and step 2 then complete.
    client = FakeClient({101: ["FAILED"]})
    R.is_transient = lambda _sid: (True, "OUT_OF_MEMORY")
    state = drive(R.ChainRunner(st, client, log=lambda m: None), cid)
    assert state == S.DONE, state
    apps = [s["app_name"] for s in client.submits]
    assert apps == ["Flash", "Flash", "Fastqc"], apps
    assert client.submits[0]["parameters"]["ram"] == 15
    # The recipe's ladder wins over doubling, because FastqcApp's ram is a selector.
    assert client.submits[1]["parameters"]["ram"] == 30, client.submits[1]
    reasons = " ".join(t["reason"] or "" for t in st.transitions(cid))
    assert "OUT_OF_MEMORY" in reasons and "retry" in reasons, reasons
    return "retried once at ram 15 -> 30, and the retry is recorded, not silent"


@case
def a_second_transient_failure_spends_the_budget_and_halts(tmp):
    st, cid = build(tmp, "retry2")
    client = FakeClient({101: ["FAILED"], 102: ["FAILED"]})
    R.is_transient = lambda _sid: (True, "OUT_OF_MEMORY")
    state = drive(R.ChainRunner(st, client, log=lambda m: None), cid)
    assert state == S.CHAIN_HALTED, state
    apps = [s["app_name"] for s in client.submits]
    assert apps == ["Flash", "Flash"], apps
    return "one retry only; the second failure halted the chain"


@case
def an_unsubmittable_app_is_refused_before_anything_is_submitted(tmp):
    st, cid = build(tmp, "inapplicable")
    client = FakeClient({}, applicable={"Fastqc"})        # Flash not submittable
    state = drive(R.ChainRunner(st, client, log=lambda m: None), cid)
    assert state == S.CHAIN_HALTED, state
    assert client.submits == [], client.submits
    return "refused before submitting, not discovered from a 422"


@case
def re_detecting_the_same_order_does_not_start_a_second_pipeline(tmp):
    st = S.Store(tmp / "idem.sqlite3")
    a, created_a = st.upsert_candidate(42, 9, "flash_then_fastqc", "v1")
    b, created_b = st.upsert_candidate(42, 9, "flash_then_fastqc", "v1")
    assert created_a and not created_b and a == b, (a, b, created_a, created_b)
    c, created_c = st.upsert_candidate(42, 9, "flash_then_fastqc", "v2")
    assert created_c and c != a
    return "same order+dataset+recipe@version is one candidate; a new version is a new one"


def main() -> int:
    ok = True
    original = R.is_transient
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        for fn in CASES:
            R.is_transient = original
            try:
                detail = fn(tmp)
                print(f"  PASS  {fn.__name__}\n        {detail}")
            except AssertionError as exc:
                ok = False
                print(f"  FAIL  {fn.__name__}\n        {exc}")
            except Exception as exc:  # noqa: BLE001
                ok = False
                print(f"  ERROR {fn.__name__}\n        {type(exc).__name__}: {exc}")
    R.is_transient = original
    print(f"\n{len(CASES)} cases, {'all pass' if ok else 'FAILURES ABOVE'}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
