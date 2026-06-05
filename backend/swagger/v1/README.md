# New SUSHI API contract — `swagger/v1/swagger.yaml`

`swagger/v1/swagger.yaml` is the **single authoritative OpenAPI contract** for New
SUSHI. **Both** the Rails v8 API and the FastAPI implementation MUST conform to it.

## Authoring rule — hand-written, never generated

This file is **hand-edited and reviewed**. It is **NOT** generated.
`rake rswag:specs:swaggerize` writes a disposable, git-ignored
`swagger/v1/_generated_from_specs.yaml` (used only for optional drift detection) and
must never target `swagger.yaml`. (See `backend/spec/swagger_helper.rb`.)

## Conventions

- OpenAPI **3.0.3**; `servers[0].url = /api/v1`; paths are **relative** to that base
  (no `/api/v1` embedded in path keys).
- Field names are **snake_case**; frontends adapt to camelCase.

## Maturity — single-encoded via `x-maturity`

- Tags are clean names only (`Auth`, `Datasets`, `Projects`, `Jobs`). Maturity is
  carried **only** by the per-operation extension `x-maturity` (value: `ratified` |
  `draft`) — never baked into tag names.
- **`ratified` means "contract frozen AND implemented".** In B1 (spec consolidation,
  no endpoint implementation) **every operation is `draft`.** Each endpoint is
  promoted to `ratified` only in the step that implements it and passes the contract
  tests (auth = B2, datasets = B3).
- **Filter rule:** the shared contract tests / CI gate enforce **only**
  `x-maturity: ratified` operations; `draft` operations are published and documented
  but not gated. (In B1 the gated set is empty, hence safe.) Enforcement is the
  responsibility of the repo-root Python contract-test runner (a later step); B1 only
  encodes this metadata and validates its well-formedness via the smoke test
  (`backend/spec/contract/contract_spec.rb`).
- `draft` endpoints are visible in `/api-docs` (rswag-ui) but return 404/501 until
  implemented — acceptable as **dev-only** information exposure. rswag-ui is mounted
  in non-production environments only (see `config/routes.rb`); production does not
  expose `/api-docs`.

## Shared, language-agnostic conformance

Conformance is enforced by the shared suite described in
`Renewal_SUSHI_plan_2025_github/docs/contract_testing_procedure_draft_20260527.md`,
run against both Rails and FastAPI. That runner consumes the contract via the
repo-root path `contract/openapi.yaml`.

### `contract/openapi.yaml` (repo root)

`contract/openapi.yaml` is a **relative symlink** to this file:

```
contract/openapi.yaml  ->  ../backend/swagger/v1/swagger.yaml
```

There is exactly one physical source of truth. On symlink-hostile checkouts
(Windows / some CI), use **copy mode**: materialize `contract/openapi.yaml` as a copy
and let CI assert `sha256sum` equality between the copy and this file (mismatch =
fail). Mode selection is declared in `.gitattributes` / a CI variable; symlink is the
default.
