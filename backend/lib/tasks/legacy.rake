require 'digest'

# Priority-1c verification harness. Read-only checks that must pass before any
# real write to the legacy SUSHI MariaDB is enabled:
#   1. key_value format parity — our serializer reproduces stored bytes exactly
#   2. timezone — legacy stores wall-clock local time (default_timezone = :local)
#   3. secret_key_base parity — required for ApiToken hashes to cross-validate
#
# Connection comes from LegacyRecord (env LEGACY_MYSQL_*). This task NEVER writes.
#
#   rake legacy:verify                 # all checks
#   rake legacy:verify SAMPLE_LIMIT=50 # cap the format sweep
#   rake legacy:verify CHECK_TOKEN=<raw>  # also try to authenticate a known token
namespace :legacy do
  desc 'Read-only parity checks against the legacy MariaDB (format / timezone / secret)'
  task verify: :environment do
    unless LegacyRecord.configured?
      abort("legacy DB not configured — set #{LegacyRecord::REQUIRED_ENV.join(', ')}")
    end
    LegacyRecord.connect_legacy!
    conn = LegacyRecord.connection
    puts "Connected to legacy DB: #{ENV['LEGACY_MYSQL_DATABASE']}@#{ENV['LEGACY_MYSQL_HOST']}"
    failures = 0

    # 1. key_value format parity ------------------------------------------------
    limit = ENV.fetch('SAMPLE_LIMIT', '100').to_i
    rows = conn.exec_query(
      "SELECT id, key_value FROM samples WHERE key_value IS NOT NULL AND key_value <> '' LIMIT #{limit.to_i}"
    )
    checked = 0
    mismatches = []
    rows.each do |row|
      checked += 1
      stored = row['key_value']
      parsed = ::Sample.new(key_value: stored).to_hash
      reserialized = ::Sample.serialize_key_value_ruby(parsed)
      mismatches << row['id'] unless reserialized == stored
    end
    if mismatches.empty?
      puts "[1/3] key_value format: OK — #{checked} sample(s) round-trip byte-identical"
    else
      failures += 1
      puts "[1/3] key_value format: FAIL — #{mismatches.size}/#{checked} mismatched (sample ids: #{mismatches.first(10).join(', ')})"
    end

    # 2. timezone ---------------------------------------------------------------
    session_tz = conn.select_value('SELECT @@session.time_zone') rescue 'unknown'
    app_tz = ActiveRecord.default_timezone
    stored_ts = conn.select_value('SELECT created_at FROM data_sets ORDER BY id DESC LIMIT 1') rescue nil
    puts "[2/3] timezone: legacy MySQL session=#{session_tz.inspect}, app default_timezone=#{app_tz.inspect}"
    puts "        latest data_sets.created_at (stored form): #{stored_ts.inspect}"
    if app_tz == :utc
      puts "        NOTE: app is :utc but legacy stores :local wall-clock time. Enabling legacy"
      puts "        WRITES requires local-time handling on the write path (not yet enabled)."
    end

    # 3. secret_key_base parity -------------------------------------------------
    # ApiToken salts SHA256 with secret_key_base; a hash written by legacy only
    # validates here if both apps share the same secret. We cannot read legacy's
    # secret, so report our fingerprint for manual comparison, and — if given a
    # known raw token — check whether it authenticates against legacy's table.
    our_fp = Digest::SHA256.hexdigest(Rails.application.secret_key_base.to_s)[0, 12]
    puts "[3/3] secret_key_base: our fingerprint sha256[0,12]=#{our_fp}"
    puts "        (legacy must run with the SAME SECRET_KEY_BASE for shared api_tokens to validate)"
    if (raw = ENV['CHECK_TOKEN'].to_s).length.positive?
      digest = ApiToken.digest(raw)
      hit = conn.select_value("SELECT COUNT(*) FROM api_tokens WHERE token_hash = #{conn.quote(digest)}").to_i
      if hit.positive?
        puts "        CHECK_TOKEN: OK — token hash found in legacy api_tokens (secrets match)"
      else
        failures += 1
        puts "        CHECK_TOKEN: FAIL — token hash not in legacy api_tokens (secret mismatch or unknown token)"
      end
    end

    puts(failures.zero? ? "\nlegacy:verify PASSED" : "\nlegacy:verify FAILED (#{failures} check(s))")
    exit(1) unless failures.zero?
  end
end
