# Omics-Studio demo on fgcz-h-083

A test instance for the team to click around in. **Its database is a separate test
database, not production** — you cannot damage anything here.

("New SUSHI" is the codename; Omics-Studio is the product name.)

| | |
|---|---|
| Web UI | <http://fgcz-h-083.fgcz-net.unizh.ch:4000> |
| API | <http://fgcz-h-083.fgcz-net.unizh.ch:3010> |
| Sign-in | B-Fabric (recommended) or your LDAP password |
| Reachable from | the FGCZ internal network |

## Signing in

Open the UI and pick one:

- **Sign in with B-Fabric** — a code appears, the link opens B-Fabric with the code
  already filled in, you approve there. Your password is typed at B-Fabric and never
  reaches this application. This instance talks to **B-Fabric test**, so use your test
  credentials.
- **LDAP password** — the usual username and password.

Either way your project list comes from LDAP, so you see the projects you already have.

Tick **"allow job submission"** at B-Fabric sign-in if you intend to run something.
Without it, reading works and submitting returns `403 insufficient_scope` — that is the
gate working, not a bug.

## Using the API from a terminal, or from Claude Code

One browser approval, then a session that renews itself for as long as B-Fabric's refresh
token lasts. No password is stored anywhere on the node.

```bash
S="python3 scripts/sushi_session/sushi-session"

# Once. Approve in a browser. --write is needed if you want to submit jobs.
# NOTE: --key-ttl goes BEFORE the subcommand.
$S --key-ttl 604800 login --instance test --write

$S status          # what is stored and how long each piece has left
$S token           # prints a valid JWT, renewing silently when needed
```

Then any route takes that token:

```bash
A=http://fgcz-h-083.fgcz-net.unizh.ch:3010
curl -H "Authorization: Bearer $($S token)" $A/api/v1/projects
curl -H "Authorization: Bearer $($S token)" $A/api/v1/projects/1535/datasets
```

Submitting a job is a POST. Note that the body is **nested under `job`**:

```bash
curl -X POST -H "Authorization: Bearer $($S token)" -H 'Content-Type: application/json' \
     -d '{"job": {"dataset_id": 12345, "app_name": "Fastqc",
                  "parameters": {"cores": 1, "scratch": 10}}}' \
     $A/api/v1/jobs
```

`next_dataset_name` and `next_dataset_comment` may be added beside `parameters` to name
the output dataset. The input dataset's project must be one you are authorized for —
otherwise the answer is `403 Forbidden`, whichever way you signed in.

For Claude Code, that is all the setup there is: `sushi-session token` supplies the
bearer, so an agent can read datasets and submit jobs without ever holding a password.

## Two things that will confuse you otherwise

**A job status is trustworthy again — but it has a history.** For a long time this node
ran two job daemons, so every job was submitted to SLURM twice and `jobs.status` was
last-writer-wins: a row could read FAILED while its result directory was complete. The
duplicate was stopped and the status has been verified 1:1 twice since (2026-09-10 job 808,
2026-09-11 jobs 810/811 — one SLURM job each).

It has come back once, within hours, because nothing yet *prevents* a second daemon from
starting. So if a status looks wrong, count the daemons before believing it:

```bash
ps -ef | grep start_sushi_jobmanager     # expect exactly one
```

Two or more means the old behaviour is back; judge that run by `sacct --allusers` and by
the result directory, and tell Masaomi.

**`403 insufficient_scope` means you signed in without write permission.** Sign in again
with `--write` (CLI) or the checkbox (UI).

## Where to complain

Anything that looks wrong, tell Masaomi. Screenshots and the URL you were on are enough;
the backend logs every request with a reason.
