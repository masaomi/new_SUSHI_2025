"""Recipe loading — the seam where the real catalog will be plugged in.

Everything else in `omakase_core` is meant to survive. This module is not: today it loads
one hand-written YAML file and matches it against everything, because the first slice is
testing the machinery around recipe selection, not the selection itself.

The real catalog (design v0.3 §5) is authored by bioinformaticians and never generated,
which is precisely why the prototype isolates it here. When it arrives, `select()` grows a
predicate evaluator over order metadata and nothing else in the package has to change.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from . import reference

RECIPE_DIR = Path(__file__).parent / "recipes"

# A recipe writes this in place of a value it cannot know, and the engine fills it in from
# the input dataset before the proposal is shown to a human. It exists so that the genome
# is visibly *derived* rather than typed in: a recipe that hardcoded `refBuild` would work
# on exactly one dataset and be wrong everywhere else, and a recipe that omitted it would
# make STAR fail at submit time with the human none the wiser.
FROM_SPECIES = "FROM_SPECIES"


class RecipeError(RuntimeError):
    pass


def load(recipe_id: str) -> dict[str, Any]:
    path = RECIPE_DIR / f"{recipe_id}.yaml"
    if not path.exists():
        raise RecipeError(f"no recipe {recipe_id} in {RECIPE_DIR}")
    with path.open(encoding="utf-8") as fh:
        recipe = yaml.safe_load(fh)
    for key in ("id", "version", "steps"):
        if key not in recipe:
            raise RecipeError(f"{path.name} is missing '{key}'")
    seqs = [int(s["seq"]) for s in recipe["steps"]]
    if seqs != sorted(seqs) or len(set(seqs)) != len(seqs):
        raise RecipeError(f"{path.name}: steps must have unique, ascending seq")
    for step in recipe["steps"]:
        dep = step.get("depends_on_seq")
        if dep is not None and int(dep) >= int(step["seq"]):
            raise RecipeError(
                f"{path.name}: step {step['seq']} depends on {dep}, which is not earlier")
    return recipe


def available() -> list[str]:
    return sorted(p.stem for p in RECIPE_DIR.glob("*.yaml"))


def select(order: dict[str, Any], recipe_id: str | None = None) -> dict[str, Any]:
    """Pick a recipe for an order.

    PLACEHOLDER. Today it returns the named recipe, or the single one whose `match` says
    `always`. The real version reads the order's service type, sequencing application and
    library protocol and evaluates the catalog's predicates -- and, when two recipes match
    equally well, that is the one place design v0.3 §8 allows a model to break the tie.
    """
    if recipe_id:
        return load(recipe_id)
    always = [r for r in (load(i) for i in available())
              if (r.get("match") or {}).get("always")]
    if len(always) != 1:
        raise RecipeError(
            f"cannot choose a recipe for order {order.get('id')}: "
            f"{len(always)} recipes claim to match everything. Name one explicitly.")
    return always[0]


def resolve_parameters(steps: list[dict[str, Any]],
                       dataset: dict[str, Any]) -> tuple[list[dict[str, Any]], list[str]]:
    """Fill every `FROM_SPECIES` sentinel from the input dataset. Returns (steps, notes).

    This runs **before** the proposal is stored, not at submit time, for one reason: the
    human who approves has to see the actual genome. A sentinel shown to a reviewer and
    expanded afterwards would make the approval meaningless — they would be signing off on
    a value they never saw.

    A dataset that cannot answer raises `reference.ReferenceError` here, so the candidate
    never reaches PROPOSED. Refusing at proposal time is the point: the alternative is a
    chain that runs for twenty minutes and returns near-zero counts against the wrong
    genome, which looks like data.

    `retry_parameters` is expanded too — a retry that dropped the genome would resubmit
    against whatever the app defaults to.
    """
    notes: list[str] = []
    resolved: str | None = None
    out: list[dict[str, Any]] = []
    for step in steps:
        step = dict(step)
        for key in ("parameters", "retry_parameters"):
            params = step.get(key)
            if not params:
                continue
            params = dict(params)
            for name, value in list(params.items()):
                if value != FROM_SPECIES:
                    continue
                if resolved is None:
                    resolved, how = reference.resolve_for_dataset(dataset)
                    notes.append(how)
                params[name] = resolved
            step[key] = params
        out.append(step)
    return out, notes
