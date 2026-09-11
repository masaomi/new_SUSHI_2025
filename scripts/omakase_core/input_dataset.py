"""B-Fabric order -> the SUSHI dataset to analyse. The last manual step in the slice.

Until now `omakase ingest --dataset 9` was typed by a human, and the delta design listed
that as the biggest gap: closing it is what makes detection -> proposal automatic, which is
what starts the supply of labels the pre-registered phase-2 gate needs 30 of.

## How the link actually exists

Not through B-Fabric. `data_sets.order_id` is derived **inside SUSHI**, from the dataset's
own `Order Id [B-Fabric]` sample column, and only when every sample agrees on exactly one
order (`backend/app/models/data_set.rb:58-77`, `check_order_ids`). A dataset spanning two
orders keeps the `order_ids` array and leaves the scalar null -- and the REST API does not
expose that array, so such a dataset is invisible here. Recorded, not worked around.

## Why the search is what it is

Measured on project 35611, 2026-09-11, all 82 datasets opened in 2.6 s:

| population | count | |
|---|---|---|
| datasets in the project | 82 | one list call; the summary does **not** carry `order_id` |
| carrying the `Order Id [B-Fabric]` **column** = 35755 | 62 | every descendant of dataset 9 inherits it |
| carrying the scalar **`order_id`** | 3 | 9, 559, 682 |
| of those, with **no parent** | **1** | dataset 9 -- the raw delivered data |

So the key is the **scalar `order_id` on a parentless dataset**, and both halves are load
bearing. Matching the column instead returns 62 candidates. Dropping the parent test
returns 3, including two that are themselves analysis output -- and analysing an analysis
is exactly the wrong answer.

Only parentless datasets are opened, which is also what makes this cheap: 7 detail calls
here rather than 82, at ~53 KB and ~29 ms each.

There is no server-side filter. `?order_id=` and `?bfabric_order_id=` on the project
datasets route are silently ignored (measured -- both returned the unfiltered page). The
column **is** indexed (`schema.rb:50`), so exposing a filter is a small backend change if
this ever needs to scale; it is not needed at one order per tick.
"""
from __future__ import annotations

from typing import Any


class InputDatasetError(RuntimeError):
    """Raised when an order does not resolve to exactly one raw dataset."""


def _unwrap(payload: dict[str, Any]) -> dict[str, Any]:
    return payload.get("dataset", payload)


def candidates(client, project_number: int) -> list[dict[str, Any]]:
    """The project's raw datasets: the ones nothing else produced."""
    return [d for d in client.project_datasets(project_number) if not d.get("parent_id")]


def resolve(client, project_number: int, order_id: int) -> tuple[int, str]:
    """`(dataset_id, how it was found)` for one order, or a refusal naming the case.

    Refusing is the expected outcome for most orders and must stay cheap to read: an order
    whose data has not been registered in SUSHI yet is the normal state of a freshly
    processed order, not an error in the usual sense.
    """
    if not project_number:
        raise InputDatasetError(
            f"order {order_id} carries no project, so there is nowhere to look for its "
            f"dataset")

    roots = candidates(client, project_number)
    if not roots:
        raise InputDatasetError(
            f"project {project_number} has no raw dataset at all (every dataset there is "
            f"the output of something else)")

    hits = []
    for row in roots:
        ds = _unwrap(client.dataset(row["id"]))
        found = ds.get("order_id")
        if found is not None and int(found) == int(order_id):
            hits.append(ds)

    if not hits:
        raise InputDatasetError(
            f"no raw dataset in project {project_number} carries order {order_id} "
            f"({len(roots)} raw dataset(s) checked). The link is the dataset's "
            f"'Order Id [B-Fabric]' column, set when the data is registered in SUSHI -- so "
            f"this usually means the data has not been registered yet")

    if len(hits) > 1:
        names = ", ".join(f"{h['id']} ({h.get('name')})" for h in hits)
        raise InputDatasetError(
            f"order {order_id} resolves to {len(hits)} raw datasets in project "
            f"{project_number}: {names}. Which one to analyse is a human's call; name it "
            f"with --dataset")

    ds = hits[0]
    return int(ds["id"]), (f"order {order_id} -> dataset {ds['id']} ({ds.get('name')}), the "
                           f"only parentless dataset of {len(roots)} in project "
                           f"{project_number} carrying that order")
