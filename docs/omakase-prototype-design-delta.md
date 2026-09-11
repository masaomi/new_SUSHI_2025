# OMAKASE prototype — design delta against v0.3

**Date:** 2026-09-10 · **Status:** agreed, implementation may start
**Applies to:** `docs/omakase-auto-analysis-design.md` v0.3

This is a **delta, not a replacement**. v0.3 stays the design of record and its version is
not bumped. Three of its sections change, one safety rail is amended, and everything else —
the layer model (§1), data minimisation (§3), the recipe catalog format (§5), the safety
rails other than retry (§11), the data model (§12) and the phase plan (§13) — stands
unchanged.

The reason a delta is enough: **v0.3 already contains the multi-App chain.** §12's
`proposal_steps(id, candidate_id, seq, app_name, params_json, depends_on_seq)` is exactly the
chain the 2026-09-10 meeting asked for. What v0.3 lacks is how the chain is *driven*.

---

## A. §4 Trigger — the open item is answered, and the code exists

v0.3 §4 said "poll the B-Fabric DB" and left an open item for Falko: *which field tells us
new data is available?*

**Answered by measurement on 2026-09-10, read-only against production:**

| | |
|---|---|
| The field | `order.status`, value **`processed`** — confirmed by the team to mean *the data is available* |
| Readable? | Yes. The order endpoint returns 50 fields; `status` is also a valid **query filter** against a fixed ~40-value enum containing `PROCESSED` |
| Also returned | `statusmodified`, `statusmodifiedby` — *when* and *by whom* |
| Set size, production | **30 orders** at `processed`, all time |
| Query cost | **0.6–2.1 s** over four runs, `return_id_only=True` |
| Not available | `statusmodifiedafter` (only `modifiedafter`); no webhook or status hook in bfabricPy |

**Two corrections to §4.** First, we read the **bfabricPy API**, not the B-Fabric database.
Second — and this matters more — the mechanism is **set reconciliation, not polling for
change**. Each tick asks for the complete set at `processed` and subtracts the handled-set.
Being down loses nothing, the watermark is our own state rather than a timestamp, and a
duplicate tick is a no-op. §4's caveat that "a status flag is a hint; the filesystem is the
truth" stands and must be honoured before proposing.

**Built:** `scripts/omakase_order_watch/` (`b4ba00f`), plain Python, read-only, 3600 s default
interval with a 300 s floor, ±10 % jitter, doubling backoff, and a `--max-new` guard.
Seeded and armed on production; the loop is not started.

---

## B. §10 State machine — the chain must be stepped, not submitted as a block

v0.3 §10 goes `APPROVED → SUBMITTED → RUNNING → (all OK → QC_RUN | any FAILED → FAILED)`,
treating the chain as one transition. That is not implementable here, for a reason v0.3
could not have known.

**`job_manager` hardcodes `afterany`** (`scheduler.py:65`), and when a parent is *already*
FAILED it attaches **no dependency at all** (case 7 of
`scripts/job_manager_contract/wait_branch_check.py`, expected value `''`). So SLURM will
start a child whose parent failed. The contract check calls this "the silent failure mode".
A colleague has been asked to make `afterok` the default; **the prototype must not depend on
that landing**, and even if it does, case 7 is a separate code path that must change too.

Therefore the chain is driven by OMAKASE, one step at a time:

```
APPROVED
   │
   ▼
 for seq = 1..N:
     submit step seq          POST /api/v1/jobs   (one call; sample mode returns many job ids)
     wait                     GET /api/v1/jobs/:id   until a terminal status
       COMPLETED  ─────────►  next seq
       FAILED     ─────────►  classify (see C)
                                transient  and attempt == 1  ──► resubmit this step
                                otherwise                    ──► CHAIN_HALTED, notify
   │
   ▼
 QC_RUN   (v0.3 §7 from here on, unchanged)
```

New states, appended to §10 rather than replacing it:
`STEP_SUBMITTED` · `STEP_RUNNING` · `STEP_COMPLETED` · `STEP_RETRIED` · `CHAIN_HALTED`.

The v0.3 invariants hold unchanged: transitions are append-only with timestamp, actor and
reason; the idempotency key stays `(order, input dataset, recipe@version)`; state is
re-derived from the OMAKASE store plus SUSHI job status, never from memory.

**The success signal is the literal `COMPLETED`.** The vocabulary on this system is
`CREATED / RUNNING / COMPLETED / FAILED / WAITING_FOR_METHODS / SCRIPT_NOT_FOUND_TRY_1`.
There is no `SUCCESS`.

Reading `jobs.status` is trustworthy again as of 2026-09-10: three job_manager daemons ran on
fgcz-h-083 and the two stale ones were killed. Verified with job **808** — one SLURM
submission (375691, COMPLETED) where job **807** four hours earlier produced three in the same
second and a row that read FAILED although the work had succeeded. Two things remain open and
are deliberately **not** compensated for in the prototype: no guard yet prevents a second
daemon starting, and fgcz-h-082 has not been checked.

---

## C. §11 amendment — retry, provisionally

v0.3 §11 says **"No auto-retry of failures — a failure notifies a human; silent retries hide
real problems."** The 2026-09-10 meeting asked for resubmission when the cause is transient.
These conflict. **Provisionally agreed compromise**, which keeps §11's intent because the
retry is never *silent*:

| Rule | |
|---|---|
| When | Only when the failure is transient **by SLURM's own report**, never by reading logs |
| Transient means | SLURM end state `OUT_OF_MEMORY`, `TIMEOUT`, `NODE_FAIL` or `PREEMPTED`. Everything else — `FAILED`, `CANCELLED`, a script error — is not transient |
| How many | **One** retry per step. A second failure halts the chain whatever the reason |
| Resources | A retry **must raise the request** (`ram`, and `scratch` / time as appropriate). Resubmitting an out-of-memory job unchanged is a guaranteed repeat |
| Record | Every retry is written to `transitions` and **shown to the human in the proposal and the result**. Nothing is hidden |

Grounding, measured on this cluster for jobs since 2026-09-01 (30,118 end states):

```
COMPLETED       27 822
FAILED           1 630
CANCELLED          563   (includes user cancellations)
OUT_OF_MEMORY       82   ─┐ the transient population
TIMEOUT              5   ─┘  87 of 30 118 jobs = 0.29%
RUNNING             16
```

So the retry path is real but rare: **87 jobs in ten days, 3.8 % of the 2 280 that did not
complete.** It is worth having and it will not run often.

`OUT_OF_MEMORY` is a state SLURM reports itself, so the classification is mechanical, not a
log heuristic. **To verify at implementation time:** that `ram` is settable through the
`parameters` object of `POST /api/v1/jobs`. `cores` and `scratch` are known to be; `ram` is a
standard SushiFabric parameter but has not been exercised through this API.

---

## D. §12 Data model — what the prototype implements

§12 is unchanged in shape. The prototype implements a subset, in **SQLite** (a prototype
store; the production choice is deferred):

`candidates` · `order_params` · `proposal_steps` · `transitions` · `submissions`

One field addition, needed by B: `submissions` gains `state`, `attempt` and `finished_at`, so
a step's own progress and its retry count are recorded where the step's job ids already live.
`notifications`, `qc_results` and `llm_calls` are not implemented in the first slice.

---

## E. Where the model may act, and where it may not

Design decision D4 is unchanged and this delta is built to respect it.

| | |
|---|---|
| **Plain code, no model** | the trigger, the timer, every state transition, the retry decision, the COMPLETED check |
| **Model may act** | proposal wording, recipe tie-break when two recipes match, QC narrative |
| **Never** | holding the timer or the state machine — that would make the order of events depend on a model's judgement and end the reproducibility claim |

The on-prem endpoint pinning and the no-free-text rule of §11 are unchanged.

---

## F. The first slice, and how it is accepted

The recipe catalog is blocked on a bioinformatician by standing decision — it is written by
hand, never generated. So the first slice makes that the **only** replaceable part and
exercises everything around it:

```
order event (built) → candidate → [FIXED recipe] → proposal → human approves → chain runner → done
                                        ▲
                          the one piece swapped later for the real recipe engine
```

**Acceptance:** a two-step chain runs end to end on fgcz-h-083 against real data, with a
human approval in the middle, and the second step starts only after the first reports
`COMPLETED`. Both a dry run and a live run. A deliberately failed first step must leave the
chain in `CHAIN_HALTED` with the second step **never submitted** — that is the case
`afterany` gets wrong, and it is the point of the whole slice.

### MET, 2026-09-11, live on fgcz-h-083

Both halves, against real data, with exactly one job_manager daemon running (counted before
starting — with two, `jobs.status` is last-writer-wins and the gate the chain rests on lies).

| | happy path | halt case |
|---|---|---|
| candidate | 1, `star_then_featurecounts@v1-derived-refbuild` | 2, `acceptance_halt_fixture@v1` |
| approved by | masaomi, 11:49 | masaomi, 12:01 |
| step 1 | STAR jobs 810, 811 → dataset 856, **COMPLETED** in 3 min | STAR jobs 814, 815, **FAILED** in 30 s |
| step 2 | FeatureCounts 812, 813 → dataset 857, submitted **after** step 1 completed | **never submitted** — no submission row exists |
| end state | `DONE` at 11:59:39 | `CHAIN_HALTED` at 12:02:59 |

The halt was decided by SLURM's own end state (377097/377098 = `FAILED`), which is not in
the transient set, so no retry was spent. Nothing relied on `afterany`.

**The genome was derived, not typed in.** Dataset 9's `Species` column says `Mus musculus`;
`/srv/GT/reference-favorite` carries exactly one mouse build; the proposal shown to the
approver already read
`Mus_musculus/GENCODE/GRCm39/Annotation/Release_M37-2025-07-03`. That it was the *right*
genome is visible in the result rather than asserted: **42 752 reads assigned across 6 795
genes** out of 100 000, with `ENSMUSG` identifiers. The 2026-08-07 chain test used an
Arabidopsis build on this same mouse dataset as a speed fixture, and would have produced
near-zero counts here.

Step 2 was given no `refBuild` and needed none — STAR's output dataset 856 carries
`Species`, `refBuild`, `paired` and `strandMode` as columns, and `FeatureCountsApp.rb:59`
reads them. Verified on 856.

**Also measured, incidentally:** one SUSHI job produced exactly one SLURM job in all six
submissions (810→377077, 811→377078, 814→377097, 815→377098, plus step 2's pair). That is
the third independent confirmation since the duplicate daemon was stopped.

### The meeting's shape, run in parallel — 2026-09-11 15:49–15:55

`recipes/rnaseq_meeting_shape.yaml`, candidate 2, **DONE in 6 min 31 s**.

| step | SLURM | started | elapsed |
|---|---|---|---|
| 1 FastQC | 377297 | 15:49:24 | 5:28 |
| 2 FastqScreen | 377298 | 15:49:44 | 3:20 |
| 3 STAR ×2 | 377300/377301 | 15:50:05 | 1:38 / 1:56 |
| 4 FeatureCounts ×2 | 377306/377307 | 15:52:55 | 1:29 / 1:24 |

Steps 1–3 started within **41 seconds** of each other. FeatureCounts went out **22 s after
STAR reported COMPLETED**, while FastQC and FastqScreen were still running — the dependent
step waits for its own parent, not for its siblings.

The saving is not merely arithmetic. The compute sums to **12 min 13 s** if run one at a
time, and the longest job — FastQC at 5:28 — is a **leaf that nothing depends on**. Serially
it delays everything; in parallel it delays nothing, and the chain's critical path is
STAR → FeatureCounts at 3 min 25 s.

**CountQC was step 5 and was removed**, with the reason measured rather than assumed: it
read its inputs correctly and then failed inside the Quarto report on **2 samples**,
producing no report, where the same app on a **6-sample** dataset succeeded on 2026-08-06.
`CountQCApp.rb` has no sample-count guard, so nothing says so. A pre-existing defect in the
app, recorded and deferred — the chain machinery was unaffected and halted with a reason.

## G. Not in this slice

The real recipe engine · B-Fabric or customer notifications (§9) · QC tiers (§7) ·
the LLM path (§8) · anything at all on fgcz-h-082 · the deadline and auto-approval clock,
which v0.3 §10 calls the only time-based transition in the system. Approval in the prototype
is explicit and human, every time.
