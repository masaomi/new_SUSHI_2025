require 'rails_helper'

RSpec.describe LegacyRecord, type: :model do
  around do |example|
    saved = LegacyRecord::REQUIRED_ENV.index_with { |k| ENV[k] }
    saved['LEGACY_MYSQL_PORT'] = ENV['LEGACY_MYSQL_PORT']
    saved['LEGACY_MYSQL_TIME_ZONE'] = ENV['LEGACY_MYSQL_TIME_ZONE']
    example.run
    saved.each { |k, v| v.nil? ? ENV.delete(k) : ENV[k] = v }
  end

  def clear_legacy_env
    (LegacyRecord::REQUIRED_ENV + %w[LEGACY_MYSQL_PORT LEGACY_MYSQL_TIME_ZONE]).each { |k| ENV.delete(k) }
  end

  describe '.configured?' do
    it 'is false when required env is absent' do
      clear_legacy_env
      expect(LegacyRecord.configured?).to be(false)
    end

    it 'is true only when all required env vars are present and non-blank' do
      clear_legacy_env
      ENV['LEGACY_MYSQL_HOST'] = 'db.example'
      ENV['LEGACY_MYSQL_DATABASE'] = 'sushi'
      expect(LegacyRecord.configured?).to be(false) # user still missing
      ENV['LEGACY_MYSQL_USER'] = 'sushilover'
      expect(LegacyRecord.configured?).to be(true)
    end
  end

  describe '.connect_legacy!' do
    it 'raises NotConfigured (never falls back to the primary DB) when env is absent' do
      clear_legacy_env
      expect { LegacyRecord.connect_legacy! }.to raise_error(LegacyRecord::NotConfigured)
    end
  end

  describe '.legacy_config' do
    before do
      clear_legacy_env
      ENV['LEGACY_MYSQL_HOST'] = 'legacy-db'
      ENV['LEGACY_MYSQL_DATABASE'] = 'sushi'
      ENV['LEGACY_MYSQL_USER'] = 'sushilover'
      ENV['LEGACY_MYSQL_PASSWORD'] = 'secret'
    end

    it 'builds a mysql2 config with an integer port' do
      ENV['LEGACY_MYSQL_PORT'] = '3307'
      cfg = LegacyRecord.legacy_config
      expect(cfg[:adapter]).to eq('mysql2')
      expect(cfg[:host]).to eq('legacy-db')
      expect(cfg[:database]).to eq('sushi')
      expect(cfg[:username]).to eq('sushilover')
      expect(cfg[:port]).to eq(3307)
    end

    it 'pins the MySQL session time zone to legacy local (Europe/Zurich) by default' do
      expect(LegacyRecord.legacy_config[:variables]).to eq(time_zone: 'Europe/Zurich')
    end

    it 'is abstract and never a concrete table-backed model' do
      expect(LegacyRecord.abstract_class).to be(true)
    end
  end

  describe '.legacy_wall_clock (local-time write primitive)' do
    # 2026-07-09 12:00 UTC == 14:00 Europe/Zurich (CEST, +02:00).
    let(:instant) { Time.utc(2026, 7, 9, 12, 0, 0) }

    it 'formats an instant as the legacy zone wall-clock naive string' do
      expect(LegacyRecord.legacy_wall_clock(instant)).to eq('2026-07-09 14:00:00.000000')
    end

    it 'is independent of the app-global ActiveRecord.default_timezone' do
      saved = ActiveRecord.default_timezone
      begin
        ActiveRecord.default_timezone = :utc
        utc_result = LegacyRecord.legacy_wall_clock(instant)
        ActiveRecord.default_timezone = :local
        local_result = LegacyRecord.legacy_wall_clock(instant)
        expect(utc_result).to eq(local_result)
        expect(utc_result).to eq('2026-07-09 14:00:00.000000')
      ensure
        ActiveRecord.default_timezone = saved
      end
    end

    it 'honors LEGACY_MYSQL_TIME_ZONE override' do
      begin
        ENV['LEGACY_MYSQL_TIME_ZONE'] = 'UTC'
        expect(LegacyRecord.legacy_wall_clock(instant)).to eq('2026-07-09 12:00:00.000000')
      ensure
        ENV.delete('LEGACY_MYSQL_TIME_ZONE')
      end
    end

    it 'reflects the winter (CET, +01:00) offset correctly' do
      winter = Time.utc(2026, 1, 15, 12, 0, 0) # 13:00 Zurich in CET
      expect(LegacyRecord.legacy_wall_clock(winter)).to eq('2026-01-15 13:00:00.000000')
    end
  end
end
