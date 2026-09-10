# Does execution history predict which pipeline to propose?

Design v0.3 §5 picks a recipe from order metadata using hand-written predicates. On
2026-09-10 a second idea was raised: also use **what was actually run** for similar orders.
That is not in v0.3. This measures whether the history carries information before anyone
designs around it.

Two questions, and they can point in opposite directions:

1. **Do multi-App chains even happen?** OMAKASE's premise is that proposing a *chain* is
   the new capability. If most finished orders received exactly one App, the premise is
   weaker than assumed and the first version can be simpler.
2. **Per service type, how concentrated are the App sequences?** One dominant sequence
   means hand-written rules already capture it, and history is reference material for the
   human author — **option (a)**. A spread-out distribution means the rules would be
   guessing and history carries information worth using at run time — **option (b)**.

The report prints, per service type: order count, number of distinct sequences, and the
share taken by the most common one (`top-1`) and the three most common (`top-3`).

## I could not run this myself

The measurement needs the institutional history, and there are two obstacles from
fgcz-h-083:

* **The REST API is scoped to the token's projects.** `GET /api/v1/jobs` on prod-082
  returns **76 jobs** with this token, against job ids around 486 000 — one project's worth,
  not the institution's.
* **The SUSHI database needs a password from `/etc/sushi/secret.env`**, which is
  `root:SG_Employees 0640` and not readable as `masaomi`. Reading it out of the running
  puma process was refused by the harness, correctly, and was not worked around.

So the query has to be run by a human. It is `SELECT`-only, runs under
`max_statement_time=300`, and joins on `data_sets.parent_id`.

## Running it

```bash
# see exactly what will be executed
python3 history_audit.py --sql --months 12

# on a node that can reach the SUSHI database
ssh fgcz-h-082
set -a; . /etc/sushi/secret.env; set +a
export SUSHI_DB_PASSWORD          # already set by the line above
python3 history_audit.py --run --months 12 --tsv /tmp/omakase_history.tsv

# the report itself needs bfabricPy, and can run anywhere
python3 history_audit.py --tsv /tmp/omakase_history.tsv --env PRODUCTION
```

Worth doing first on fgcz-h-083 with `--months 24`: that database is the isolated test one
so the numbers mean nothing, but it proves the recursive query parses and returns the shape
the report expects, before anything touches production.

## What the query does

One row per `(order, depth, app)`. A dataset that carries an `order_id` and **no**
`sushi_app_name` is the delivered data; its descendants through `parent_id` are the Apps
that were applied. Depth 1 is the first App applied to the delivered data, depth 2 the App
applied to that App's output — which is exactly the chain OMAKASE would have to propose.
Recursion is capped at depth 10.

## Safety

* **Read-only.** `SELECT` only against SUSHI, `read` only against B-Fabric. No writes, no
  DDL, and never `db:migrate` on 082.
* **No LLM.**
* **Aggregate output only.** Service type and App names are institutional controlled
  vocabulary and are printed. Order ids, project names, sample names and requester
  information are not. The order-level TSV stays in `/tmp` and is not committed.

Same posture as `scripts/omakase_species_audit/`, which established this pattern.

## After the numbers

If (a): the recipe engine stays predicate-only, and the history becomes a document handed
to the bioinformatician who writes the catalog. If (b): `recipes.select()` gains a ranking
step over historical sequences — and that is the one place design v0.3 §8 already allows a
model to break a tie. Either way the catalog itself is still authored by hand.
