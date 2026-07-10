require 'rails_helper'
require Rails.root.join('lib', 'apps', 'FastqcApp').to_s

# Regression coverage for the partition-default bug found during the
# fgcz-h-083 MySQL coexistence test (2026-07-10): FastqcApp#set_default_parameters
# overrode the base SushiApp implementation WITHOUT calling `super`, so the base
# partition default was never applied. An empty partition was serialized as
# `param[['partition']] = ''`, which the job_manager translated to `sbatch -p nan`,
# causing SLURM_ERROR_ON_SUBMIT. The fix adds `super` so base defaults run first.
RSpec.describe FastqcApp do
  describe '#set_default_parameters' do
    subject(:app) { described_class.new }

    it 'starts with an empty partition before defaults are applied' do
      expect(app.params['partition']).to eq('')
    end

    it 'applies the base partition default via super (regression: -p nan)' do
      app.set_default_parameters
      expect(app.params['partition']).to eq(SushiConfigHelper.default_partition)
      expect(app.params['partition']).not_to be_empty
    end

    it 'still sets the app-specific paired default' do
      app.set_default_parameters
      expect([true, false]).to include(app.params['paired'])
    end
  end
end
