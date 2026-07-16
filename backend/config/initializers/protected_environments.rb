# frozen_string_literal: true

# Belt-and-suspenders against destructive schema tasks on the shared legacy DB.
#
# When coexisting with legacy production SUSHI on the shared `sushi` MySQL DB
# (LEGACY_DATABASE=true), the app must be strictly additive-only: it must NEVER run
# DDL against that live schema. `protected_environments` makes ActiveRecord refuse
# destructive tasks (db:drop, db:truncate_all, db:schema:load, etc.) whose target
# environment is protected — a guard against an accidental `RAILS_ENV=production
# rails db:*`.
#
# NOTE: protected_environments does NOT block `db:migrate`. The AUTHORITATIVE
# structural guard is a read-restricted MySQL GRANT for the app's DB user (no
# CREATE/ALTER/DROP; and for a read-only surface, no INSERT/UPDATE/DELETE) — that is
# a DB-admin (sysadmin) action, tracked on the deployment runbook, not here.
#
# Assign directly on ActiveRecord::Base (initializers run after ActiveRecord loads,
# so config.active_record.* would already be applied and setting it here would be a
# no-op). `on_load` is used so the value is set once ActiveRecord is available.
ActiveSupport.on_load(:active_record) do
  self.protected_environments = %w[production]
end
