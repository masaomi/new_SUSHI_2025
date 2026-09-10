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

RECIPE_DIR = Path(__file__).parent / "recipes"


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
