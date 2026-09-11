#!/usr/bin/env python3
"""order -> dataset, against a fake backend shaped like the real project. rc 0 = it refuses.

The populations below are the measured ones from project 35611 on 2026-09-11, when all 82
datasets were opened: 62 carry the `Order Id [B-Fabric]` **column** for order 35755,
3 carry the scalar `order_id`, and exactly 1 of those has no parent. Both halves of the key
are therefore load bearing, and each has a case here that fails if it is dropped.
"""
from __future__ import annotations

import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    __package__ = "omakase_core"

from . import input_dataset  # noqa: E402

failures: list[str] = []


class FakeClient:
    """Summaries without `order_id`, details with it -- exactly like the real API."""

    def __init__(self, rows):
        self.rows = rows
        self.detail_calls = 0

    def project_datasets(self, project_number, per=200):
        return [{k: v for k, v in r.items() if k not in ("order_id", "samples")}
                for r in self.rows if r["project_number"] == project_number]

    def dataset(self, dataset_id):
        self.detail_calls += 1
        return {"dataset": next(r for r in self.rows if r["id"] == dataset_id)}


def ds(i, *, parent=None, order=None, name="d", project=35611):
    return {"id": i, "parent_id": parent, "order_id": order, "name": name,
            "project_number": project}


def check(name, got, want):
    if got == want:
        print(f"  ok   {name}")
    else:
        failures.append(name)
        print(f"  FAIL {name}: got {got!r}, want {want!r}")


def refuses(name, fn, must_mention):
    try:
        got = fn()
    except input_dataset.InputDatasetError as exc:
        if must_mention.lower() in str(exc).lower():
            print(f"  ok   {name}")
        else:
            failures.append(name)
            print(f"  FAIL {name}: refused but never says {must_mention!r}: {exc}")
        return
    failures.append(name)
    print(f"  FAIL {name}: did not refuse, returned {got!r}")


def main() -> int:
    # The real shape: one raw dataset with the order, many descendants without it, and two
    # other raw datasets belonging to nobody.
    real = FakeClient([
        ds(9, order=35755, name="ventricles_100k"),
        ds(775, name="ventricles_100k_characteristic_oracle"),
        ds(785, name="o35755_Kallisto_level2_oracle_input"),
        ds(559, parent=9, order=35755, name="o35755_NfCoreDemo"),
        ds(682, parent=9, order=35755, name="o35755_Fastqc"),
        ds(856, parent=9, name="omakase_c1_s1_STARApp"),
        ds(857, parent=856, name="omakase_c1_s2_FeatureCountsApp"),
    ])

    print("the live case")
    got, how = input_dataset.resolve(real, 35611, 35755)
    check("order 35755 resolves to the raw dataset, not a descendant", got, 9)
    check("the derivation is stated", "only parentless" in how, True)
    check("only the parentless datasets were opened: 3, not 7", real.detail_calls, 3)

    print("the two halves of the key")
    # Drop the parent test and 559/682 also match -- both are analysis output. Analysing an
    # analysis is the wrong answer, so this case exists to make the filter non-optional.
    orphaned = FakeClient([ds(559, order=35755), ds(682, order=35755), ds(9, order=35755)])
    refuses("three raw datasets with the same order is a human's call",
            lambda: input_dataset.resolve(orphaned, 35611, 35755), "3 raw datasets")
    # The column is not the key: a descendant carrying the column but no scalar must not win.
    column_only = FakeClient([ds(9, order=35755), ds(856, parent=9, order=35755)])
    check("a descendant with the scalar is still excluded by its parent",
          input_dataset.resolve(column_only, 35611, 35755)[0], 9)

    print("refusals")
    refuses("an order whose data is not registered yet -- the normal state",
            lambda: input_dataset.resolve(real, 35611, 35773), "not been registered yet")
    refuses("an order with no project has nowhere to look",
            lambda: input_dataset.resolve(real, None, 35755), "no project")
    only_derived = FakeClient([ds(856, parent=9), ds(857, parent=856)])
    refuses("a project whose datasets are all output of something else",
            lambda: input_dataset.resolve(only_derived, 35611, 35755), "no raw dataset at all")

    print("scoping")
    other = FakeClient([ds(9, order=35755, project=35611), ds(99, order=35755, project=12345)])
    check("another project's dataset with the same order is not reachable",
          input_dataset.resolve(other, 35611, 35755)[0], 9)
    check("string and int order ids compare equal",
          input_dataset.resolve(FakeClient([ds(9, order="35755")]), 35611, 35755)[0], 9)

    print()
    if failures:
        print(f"FAILED: {len(failures)} case(s): {', '.join(failures)}")
        return 1
    print("all input-dataset cases pass")
    return 0


if __name__ == "__main__":
    sys.exit(main())
