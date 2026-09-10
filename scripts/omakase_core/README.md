# omakase_core — the prototype's first vertical slice

Implements `docs/omakase-auto-analysis-design.md` v0.3 as amended by
`docs/omakase-prototype-design-delta.md`:

```
order event  ->  candidate  ->  [FIXED recipe]  ->  proposal  ->  human approves
             ->  chain runner, one step at a time  ->  DONE or CHAIN_HALTED
```

The order event comes from `scripts/omakase_order_watch/`, which notices when a B-Fabric
order reaches `status=processed`.

**No model is involved anywhere in this package.** Design decision D4 keeps the trigger,
the timer, every state transition and the retry decision in ordinary code, so the order in
which things happen cannot depend on a model's judgement.

## Why the chain is stepped

`job_manager` hardcodes `afterany` (`scheduler.py:65`) and, when a parent has *already*
failed, attaches no dependency at all (case 7 of
`scripts/job_manager_contract/wait_branch_check.py`). **SLURM will start a child whose
parent failed.** So the runner submits step N+1 only after step N reports `COMPLETED`, and
nothing here relies on SLURM to stop a chain.

`COMPLETED` is the literal. There is no `SUCCESS` state on this system.

## Use

```bash
cd scripts
python3 -m omakase_core.omakase recipes
python3 -m omakase_core.omakase ingest  --event ~/.omakase/events/order_40917.json --dataset 9
python3 -m omakase_core.omakase show    --candidate 1
python3 -m omakase_core.omakase approve --candidate 1 --actor <you>
python3 -m omakase_core.omakase run     --candidate 1 --dry-run
python3 -m omakase_core.omakase run     --candidate 1
```

`--dataset` is explicit: resolving the SUSHI input dataset from a B-Fabric order is not in
this slice. Approval is explicit and human every time; the deadline-driven auto-approval of
v0.3 §10 is deliberately absent.

Store defaults to `~/.omakase/omakase.sqlite3`. Tables are v0.3 §12 — `candidates`,
`order_params`, `proposal_steps`, `transitions`, `submissions` — with two additions the
stepped runner needs: `submissions.state/attempt/finished_at`, and
`proposal_steps.retry_params_json`.

## Two app lists, and only one of them can be submitted

This cost a live 422 to discover and is the trap most likely to bite the next person.

| | |
|---|---|
| `GET /api/v1/datasets/:id` | every app the legacy catalogue thinks is **column-compatible** — 175 for dataset 9 |
| `GET /api/v1/application_configs` | the **18** this backend will actually run: one native (`Fastqc`) plus the 17 in `config.legacy_apps_allowlist` |

`FlashApp` is in the first list and not the second, which is why
`recipes/flash_then_fastqc.yaml` is disabled rather than deleted — it is the regression
case in prose. The runner checks the second list before submitting and halts with a reason.

The chain the 2026-09-10 meeting asked for is entirely inside the submittable 18: **STAR,
FeatureCounts, CountQC, EdgeR.** See `recipes/star_then_featurecounts.yaml`, which is a
draft and has not been run — it needs `refBuild` resolved from the order's species, and a
bioinformatician.

## Retry

Provisional compromise agreed 2026-09-10, amending v0.3 §11's flat "no auto-retry":

* transient **by SLURM's own report** only — `OUT_OF_MEMORY`, `TIMEOUT`, `NODE_FAIL`,
  `PREEMPTED`. Never by reading logs. Unknown counts as not transient.
* **one** retry per step; a second failure halts the chain whatever the reason.
* the retry must **ask for more**, or an out-of-memory job repeats identically. The recipe
  states the larger values, because several apps declare `ram` as a selector — FastqcApp
  offers `[15, 30, 62]`, so doubling 30 would ask for 60, which is not on offer.
* every retry is written to `transitions` and shown to the human. Never silent.

Grounding: of 30 118 SLURM end states since 2026-09-01, 82 were `OUT_OF_MEMORY` and 5
`TIMEOUT` — 0.29 % of all jobs, 3.8 % of the 2 280 that did not complete. Real, but rare.

## Tests

```bash
python3 omakase_core/test_runner.py     # rc 0 = the runner behaves as the delta says
```

Six cases against a fake backend, because the one that matters cannot be produced on demand
against a cluster: **a step fails for a non-transient reason and the next step is never
submitted.** That is what `afterany` gets wrong, and it is why the runner exists.

## Not in this slice

The real recipe engine · resolving a SUSHI dataset from a B-Fabric order · notifications ·
QC tiers · the LLM path · the auto-approval clock · anything at all on fgcz-h-082.
