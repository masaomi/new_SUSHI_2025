require 'rails_helper'

# Focused unit coverage for the SAMPLE-mode fan-out logic (legacy parity: one job
# unit per sample) and DATASET single-unit behavior. Uses a lightweight fake app so
# no DB/gstore is touched; end-to-end submission is exercised via the request specs.
RSpec.describe JobSubmissionService do
  # Minimal stand-in for a loaded SushiApp exposing just the surface build_job_units uses.
  let(:fake_app_class) do
    Class.new do
      attr_accessor :dataset, :last_job
      attr_reader :params, :dataset_hash, :job_script_dir

      def initialize(mode:, rows:, dir:)
        @params = { 'process_mode' => mode }
        @dataset_hash = rows
        @job_script_dir = dir
        @dataset = rows # set_input_dataset leaves @dataset as the full array
      end

      def generate_job_script
        tag = @dataset.is_a?(Hash) ? @dataset['Name'] : 'DATASET'
        "#!/bin/bash\n# #{tag}\n"
      end

      def next_dataset
        name = @dataset.is_a?(Hash) ? @dataset['Name'] : 'result'
        { 'Name' => name, 'Out [File]' => "path/#{name}" }
      end
    end
  end

  let(:tmpdir) { Dir.mktmpdir }
  after { FileUtils.remove_entry(tmpdir) if Dir.exist?(tmpdir) }

  def service_for(app)
    svc = described_class.new(dataset_id: 1, app_name: 'X', parameters: {}, user: 'u')
    svc.instance_variable_set(:@sushi_app, app)
    svc.instance_variable_set(:@app_name, 'X')
    svc.instance_variable_set(:@dataset_id, 1)
    svc
  end

  describe '#build_job_units' do
    it 'produces one unit per sample in SAMPLE mode, each with its own script' do
      rows = [{ 'Name' => 's1', 'Read1 [File]' => 'a' }, { 'Name' => 's2', 'Read1 [File]' => 'b' }]
      units = service_for(fake_app_class.new(mode: 'SAMPLE', rows: rows, dir: tmpdir)).send(:build_job_units)

      expect(units.size).to eq(2)
      expect(units.map { |u| u[:next_dataset]['Name'] }).to eq(%w[s1 s2])
      expect(units).to all(satisfy { |u| File.exist?(u[:script_path]) })
      expect(units.map { |u| u[:script_path] }.uniq.size).to eq(2)
    end

    it 'produces a single unit in DATASET mode regardless of sample count' do
      rows = [{ 'Name' => 's1' }, { 'Name' => 's2' }]
      units = service_for(fake_app_class.new(mode: 'DATASET', rows: rows, dir: tmpdir)).send(:build_job_units)

      expect(units.size).to eq(1)
      expect(units.first[:next_dataset]['Name']).to eq('result')
    end

    it 'defaults an unset process_mode to SAMPLE (legacy default)' do
      rows = [{ 'Name' => 's1' }, { 'Name' => 's2' }]
      units = service_for(fake_app_class.new(mode: '', rows: rows, dir: tmpdir)).send(:build_job_units)

      expect(units.size).to eq(2)
    end
  end

  describe '#clean_row' do
    it 'strips column-name tags so per-sample keys are untagged' do
      svc = described_class.new(dataset_id: 1, app_name: 'X', parameters: {}, user: 'u')
      cleaned = svc.send(:clean_row, 'Read1 [File]' => 'x', 'Name' => 'n', 'Genotype [Factor]' => 'mut')
      expect(cleaned).to eq('Read1' => 'x', 'Name' => 'n', 'Genotype' => 'mut')
    end
  end
end
