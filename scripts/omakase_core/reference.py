"""Species -> reference build, by reading the curated farm. Never by inventing a policy.

The 2026-09-10 meeting named two judgements the system has to make on its own. This is the
first of them: *STARApp's reference genome, derived from the order metadata rather than
typed in.*

**There is nothing to decide.** `/srv/GT/reference-favorite` already **is**
`reference_for(species)` — a hand-curated symlink farm maintained by the genome team,
pointing into `/srv/GT/reference`, and the same list SUSHI's own `refBuild` dropdown shows
first. Measured 2026-09-11: five species, **exactly one build each**.

| species | refBuild |
|---|---|
| Arabidopsis_thaliana | TAIR/TAIR10/Annotation/Release_57-2023-09-06 |
| Canis_familiaris | Ensembl/ROS_Cfam_1.0/Annotation/Release113-2025-07-02 |
| Homo_sapiens | GENCODE/GRCh38.p14/Annotation/Release_48-2025-07-03 |
| Mus_musculus | GENCODE/GRCm39/Annotation/Release_M37-2025-07-03 |
| Rattus_norvegicus | Ensembl/GRCr8/Annotation/Release_114-2025-07-03 |

So this module reads the farm and refuses everything it cannot read off it. That is the
whole design, and the refusals matter more than the successes:

* **no Species** — 39.2 % of delivered datasets say `NA`, `n/a` or nothing (measured
  2026-08-21 over 1376 raw datasets). A missing genome must stop the proposal, not default.
* **more than one Species in one dataset** — 5.7 % of datasets. No single `refBuild` covers
  them, so there is no honest answer and none is given.
* **a species the farm does not carry** — the team curates five. A sixth is a request to the
  genome team, not a path for this code to construct.

A wrong genome is worse than a refused submission: STAR will happily align mouse reads to a
plant genome and return a result directory full of near-zero counts, which looks like data.
"""
from __future__ import annotations

import os
import re
from pathlib import Path

# Overridable so the tests can point at a fixture farm instead of the real one.
FAVORITE_ROOT = Path(os.environ.get("OMAKASE_REFERENCE_FAVORITE", "/srv/GT/reference-favorite"))

# Values that mean "nobody filled this in". Measured on production: `NA`, `n/a` and blank
# together are 39.2 % of delivered datasets.
_ABSENT = {"", "na", "n/a", "none", "null", "unknown", "-"}


class ReferenceError(RuntimeError):
    """Raised when no single reference build can be read off the curated farm."""


def _key(species: str) -> str:
    """`Mus musculus`, `mus_musculus`, ` Mus  Musculus ` -> `mus musculus`."""
    return re.sub(r"[\s_]+", " ", str(species)).strip().lower()


def builds(root: Path | None = None) -> dict[str, list[str]]:
    """Every curated build, keyed by normalised species name.

    A build is `<species>/<provider>/<assembly>/Annotation/<release>` and is recognised by
    the `Genes` directory inside it. That test is what excludes the `Annotation/Genes`
    convenience symlink some species carry, which is a shortcut to the current release's
    contents and not a release of its own.
    """
    root = root or FAVORITE_ROOT
    found: dict[str, list[str]] = {}
    if not root.is_dir():
        return found
    for species_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        for release in sorted(species_dir.glob("*/*/Annotation/*")):
            if not (release / "Genes").exists():
                continue
            found.setdefault(_key(species_dir.name), []).append(
                str(release.relative_to(root)))
    return found


def species_of(dataset: dict) -> list[str]:
    """The distinct, non-absent Species values of a SUSHI dataset, in first-seen order.

    `Species` is a dataset column, not a B-Fabric order field — the 2026-08-20 audit looked
    for it in all 49 order fields and all 13 sample fields and found nothing. It arrives on
    the delivered dataset, which is also why 13 of the 18 allow-listed apps already require
    the column: reading it costs nothing extra.
    """
    ds = dataset.get("dataset", dataset)
    seen: list[str] = []
    for sample in ds.get("samples") or []:
        raw = sample.get("Species")
        if raw is None or _key(raw) in _ABSENT:
            continue
        if _key(raw) not in [_key(s) for s in seen]:
            seen.append(str(raw).strip())
    return seen


def resolve(species_values: list[str], root: Path | None = None) -> str:
    """The one refBuild for these species values, or a refusal that says which case it is."""
    catalog = builds(root)
    if not catalog:
        raise ReferenceError(
            f"the curated reference farm at {root or FAVORITE_ROOT} is unreadable or empty; "
            f"refusing to guess a genome")
    if not species_values:
        raise ReferenceError(
            "the dataset carries no usable Species value (39.2 % of delivered datasets do "
            "not), so no reference genome can be derived; set Species or name refBuild by "
            "hand")
    if len(species_values) > 1:
        raise ReferenceError(
            f"the dataset carries {len(species_values)} species ({', '.join(species_values)}); "
            f"no single refBuild covers them, so none is chosen")

    species = species_values[0]
    hits = catalog.get(_key(species))
    if not hits:
        raise ReferenceError(
            f"'{species}' is not one of the {len(catalog)} curated species "
            f"({', '.join(sorted(catalog))}); adding one is a request to the genome team, "
            f"not something this code may construct")
    if len(hits) > 1:
        raise ReferenceError(
            f"'{species}' has {len(hits)} curated builds ({', '.join(hits)}); the farm is "
            f"expected to carry exactly one, so a human must name it")
    return hits[0]


def resolve_for_dataset(dataset: dict, root: Path | None = None) -> tuple[str, str]:
    """`(refBuild, how it was derived)` for a SUSHI dataset. Raises on every ambiguity."""
    found = species_of(dataset)
    build = resolve(found, root)
    return build, f"Species={found[0]} -> {FAVORITE_ROOT.name}/{build}"
