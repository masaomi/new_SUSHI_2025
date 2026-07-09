# Legacy MariaDB write parity — prerequisites (priority-1c)

New SUSHI (Rails) acts as a validation oracle for the legacy SUSHI production
database during the migration. Before any code path is allowed to **write** to
the legacy MariaDB, three properties must match legacy exactly, otherwise we
corrupt production data. This document records their status.

The read-only connection and checks live in:

- `app/models/legacy_record.rb` — env-driven (`LEGACY_MYSQL_*`), lazy, opt-in
  connection to the legacy MariaDB. Deliberately kept out of `config/database.yml`
  so it cannot be swept into `rails db:*` tasks or RSpec test-schema maintenance.
- `app/models/legacy/{sample,data_set,project}.rb` — read models on that
  connection.
- `lib/tasks/legacy.rake` (`rake legacy:verify`) — read-only verification harness.

Run against a real legacy DB with, e.g.:

```
LEGACY_MYSQL_HOST=... LEGACY_MYSQL_DATABASE=sushi LEGACY_MYSQL_USER=... \
LEGACY_MYSQL_PASSWORD=... bundle exec rake legacy:verify
```

## 1. key_value format — VERIFIED (byte-identical)

Legacy stores each sample's columns as a Ruby `Hash#inspect` string that legacy
and btools read back with `eval()`. The exact stored form (observed verbatim in
a real legacy DB, Ruby 3.3.7) is:

```
{"Name"=>"sA", "[File]Read1"=>"p8888/data/a.fastq.gz"}
```

i.e. double-quoted keys/values, `=>` with **no** surrounding spaces, `", "`
between pairs, `nil` as a bareword, backslash-then-quote escaping, and **key
order preserved** (Name first). `Sample.serialize_key_value_ruby` reproduces this
byte-for-byte; confirmed on every real sample in the legacy dev DB (6/6) and
pinned in `spec/models/sample_spec.rb` ("legacy production format parity").
Note both tag forms occur in real data: `[File]Read1` (tag prefix) and
`Read1 [File]` (tag suffix); the serializer treats keys verbatim.

## 2. timezone — MISMATCH, write-path handling REQUIRED (not yet enabled)

Legacy Rails runs `config.time_zone = 'Europe/Zurich'` and
`config.active_record.default_timezone = :local`, so DB datetimes are **wall-clock
local time** (e.g. `2026-07-03 16:18:28.461302` is 16:18 in Zurich, not UTC).

New SUSHI currently runs the Rails 8 default `default_timezone = :utc`. Reading a
legacy row through our app therefore mis-labels the same wall-clock string as UTC.
`LegacyRecord.legacy_config` pins the MySQL **session** `time_zone` to
`Europe/Zurich` so server-side time functions agree, but the Ruby-side
`default_timezone` is a global setting.

**Consequence:** enabling legacy **writes** requires local-time handling on the
legacy write path (either a scoped `:local` conversion when persisting to
`LegacyRecord`, or writing pre-formatted local timestamps). This is the immediate
follow-up before the first real write; it is intentionally **not** enabled here.

## 3. secret_key_base parity — REQUIREMENT documented, verifiable via token check

`ApiToken` stores only `SHA256(secret_key_base + raw_token)`. Legacy uses the
identical salt (`Rails.application.secret_key_base`). A token row written by
legacy therefore validates in New SUSHI **only if both apps run with the same
`SECRET_KEY_BASE`**. We cannot read legacy's secret, so `legacy:verify` reports
our secret fingerprint (`sha256[0,12]`) for manual comparison, and — given a known
raw token via `CHECK_TOKEN=` — checks whether its hash exists in legacy's
`api_tokens` table (a positive hit proves the secrets match).

## Status summary

| Prerequisite        | Status                                              |
|---------------------|-----------------------------------------------------|
| key_value format    | ✅ verified byte-identical (spec-pinned)             |
| timezone            | ⚠️ mismatch understood; write-path handling pending  |
| secret_key_base     | ✅ requirement + check documented (needs real token) |

Real writes to the legacy MariaDB stay disabled until the timezone write-path
handling lands and `legacy:verify` passes against the production DB.
