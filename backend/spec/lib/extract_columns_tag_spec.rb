require 'rails_helper'
require Rails.root.join('lib', 'sushi_fabric').to_s

# Regression for the inherited-column tag-doubling bug: get_columns_with_tag must strip
# the tag from the matched key so extract_column re-adds it exactly once. Before the fix
# an inherited "Genotype [Factor]" became "Genotype [Factor] [Factor]" (and in SAMPLE mode
# the @dataset lookup missed, yielding nil), corrupting every output dataset that inherits
# Factor/B-Fabric columns.
RSpec.describe 'GlobalVariables#extract_columns tag handling' do
  let(:app) { SushiFabric::SushiApp.new }

  before do
    app.instance_variable_set(:@dataset_hash, [
      { 'Name' => 's1', 'Genotype [Factor]' => 'mut', 'Order Id [B-Fabric]' => '123' },
      { 'Name' => 's2', 'Genotype [Factor]' => 'wt',  'Order Id [B-Fabric]' => '124' }
    ])
  end

  it 'DATASET mode: single tag, values aggregated across samples' do
    app.params['process_mode'] = 'DATASET'
    app.instance_variable_set(:@dataset, app.instance_variable_get(:@dataset_hash))
    out = app.extract_columns(tags: %w[Factor B-Fabric])
    expect(out.keys).to contain_exactly('Genotype [Factor]', 'Order Id [B-Fabric]')
    expect(out['Genotype [Factor]']).to eq('mut,wt')
  end

  it 'SAMPLE mode: single tag, per-sample value (cleaned @dataset hash)' do
    app.params['process_mode'] = 'SAMPLE'
    app.instance_variable_set(:@dataset, { 'Name' => 's1', 'Genotype' => 'mut', 'Order Id' => '123' })
    out = app.extract_columns(tags: %w[Factor B-Fabric])
    expect(out.keys).to contain_exactly('Genotype [Factor]', 'Order Id [B-Fabric]')
    expect(out['Genotype [Factor]']).to eq('mut')
    expect(out['Order Id [B-Fabric]']).to eq('123')
  end

  it 'normalizes an already-doubled input tag to a single tag' do
    app.instance_variable_set(:@dataset_hash, [{ 'Name' => 's1', 'Genotype [Factor] [Factor]' => 'mut' }])
    app.params['process_mode'] = 'DATASET'
    app.instance_variable_set(:@dataset, app.instance_variable_get(:@dataset_hash))
    out = app.extract_columns(tags: %w[Factor])
    expect(out.keys).to eq(['Genotype [Factor]'])
  end
end
