require 'digest'

# Read-oriented connection to the legacy SUSHI production MariaDB, used by the
# validation oracle to compare New SUSHI behavior against real legacy data
# (priority-1c). This is the prerequisite plumbing before any real legacy-DB
# write is enabled.
#
# Why establish_connection here instead of a database.yml + connects_to entry:
# putting the legacy DB in the primary multi-database config would pull it into
# `rails db:*` tasks and RSpec's test-schema maintenance, which must never touch
# a production DB. As a single external database it is cleanest to keep it out of
# the app's config entirely and connect on demand from env. Functionally this is
# the reading role of a connects_to for the one external legacy database.
#
# The connection is configured ONLY from env (LEGACY_MYSQL_*), connects lazily on
# first query, and is opt-in: if the env is absent, `connect_legacy!` raises a
# clear error rather than silently falling back to the app's primary DB.
#
# Timezone: legacy Rails runs default_timezone = :local with time_zone
# 'Europe/Zurich', i.e. wall-clock local time in the DB. We pin the MySQL session
# time_zone to match so reads line up. NOTE: New SUSHI's own tables are UTC, so
# enabling legacy WRITES will additionally require local-time handling on the
# write path — tracked as the follow-up to this task, not enabled here.
class LegacyRecord < ActiveRecord::Base
  self.abstract_class = true

  REQUIRED_ENV = %w[LEGACY_MYSQL_HOST LEGACY_MYSQL_DATABASE LEGACY_MYSQL_USER].freeze

  class NotConfigured < StandardError; end

  def self.configured?
    REQUIRED_ENV.all? { |k| ENV[k].to_s.strip != '' }
  end

  def self.legacy_config
    {
      adapter:  'mysql2',
      encoding: ENV.fetch('LEGACY_MYSQL_ENCODING', 'utf8'),
      host:     ENV['LEGACY_MYSQL_HOST'],
      port:     ENV.fetch('LEGACY_MYSQL_PORT', '3306').to_i,
      database: ENV['LEGACY_MYSQL_DATABASE'],
      username: ENV['LEGACY_MYSQL_USER'],
      password: ENV['LEGACY_MYSQL_PASSWORD'],
      pool:     ENV.fetch('RAILS_MAX_THREADS', '5').to_i,
      # Match legacy's wall-clock local storage (default_timezone = :local).
      variables: { time_zone: ENV.fetch('LEGACY_MYSQL_TIME_ZONE', 'Europe/Zurich') }
    }
  end

  # Establish the lazy connection pool. Safe to call when the DB is unreachable
  # (the TCP connect happens on first query); raises only if env is missing.
  def self.connect_legacy!
    unless configured?
      raise NotConfigured, "legacy DB not configured — set #{REQUIRED_ENV.join(', ')}"
    end
    establish_connection(legacy_config)
    self
  end
end
