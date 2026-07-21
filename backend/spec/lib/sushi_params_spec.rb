require 'rails_helper'
require Rails.root.join('lib', 'sushi_fabric').to_s

# Hash-compatible helpers on SushiParams that legacy apps call directly (e.g.
# ScSeuratApp#set_default_parameters does @params.delete('geneCountModel')).
RSpec.describe SushiFabric::SushiParams do
  subject(:params) { described_class.new }

  describe '#delete' do
    it 'removes the param and returns its value' do
      params['geneCountModel'] = %w[Gene GeneFull]
      expect(params.delete('geneCountModel')).to eq(%w[Gene GeneFull])
      expect(params.key?('geneCountModel')).to be(false)
    end

    it 'also clears the param metadata' do
      params['ram', 'description'] = 'GB'
      params['ram'] = 15
      params.delete('ram')
      expect(params.all_metadata['ram']).to be_nil
    end
  end

  describe 'hash-compatible reads' do
    it 'empty? / values / has_key? / include? delegate to the params hash' do
      expect(params.empty?).to be(true)
      params['a'] = 2
      expect(params.empty?).to be(false)
      expect(params.values).to eq([2])
      expect(params.has_key?('a')).to be(true)
      expect(params.include?('a')).to be(true)
      expect(params.include?('missing')).to be(false)
    end
  end
end
