require 'rails_helper'

RSpec.describe Sample, type: :model do
  describe 'associations' do
    it 'belongs to data_set' do
      expect(Sample.reflect_on_association(:data_set).macro).to eq(:belongs_to)
    end
  end

  describe '.serialize_key_value_ruby' do
    it 'serializes a single pair in legacy Ruby hash-rocket format' do
      expect(Sample.serialize_key_value_ruby({ 'Name' => 's1' })).to eq('{"Name"=>"s1"}')
    end

    it 'joins multiple pairs with ", " and preserves insertion order' do
      hash = { 'Name' => 'A', 'Value' => '100', 'Other' => 'x' }
      expect(Sample.serialize_key_value_ruby(hash)).to eq('{"Name"=>"A", "Value"=>"100", "Other"=>"x"}')
    end

    it 'keeps tagged header keys verbatim' do
      hash = { 'Name' => 'S1', 'Read1 [File]' => 'p1001/f.gz', 'Condition [Factor]' => 'A', 'Order Id [B-Fabric]' => '12345' }
      expect(Sample.serialize_key_value_ruby(hash)).to eq(
        '{"Name"=>"S1", "Read1 [File]"=>"p1001/f.gz", "Condition [Factor]"=>"A", "Order Id [B-Fabric]"=>"12345"}'
      )
    end

    it 'escapes backslash then double quote in values' do
      hash = { 'K' => 'a"b\\c' }
      # value a"b\c  ->  a\"b\\c
      expect(Sample.serialize_key_value_ruby(hash)).to eq('{"K"=>"a\\"b\\\\c"}')
    end

    it 'emits nil as a bareword (unquoted)' do
      expect(Sample.serialize_key_value_ruby({ 'K' => nil })).to eq('{"K"=>nil}')
    end

    it 'serializes an empty hash as {}' do
      expect(Sample.serialize_key_value_ruby({})).to eq('{}')
    end

    it 'round-trips through the reader (to_hash reads what we wrote)' do
      hash = { 'Name' => 'S1', 'Read1 [File]' => 'p1001/data/file1.fastq.gz', 'Condition [Factor]' => 'A' }
      serialized = Sample.serialize_key_value_ruby(hash)
      expect(Sample.new(key_value: serialized).to_hash).to eq(hash)
    end

    it 'matches Ronald FastAPI serialize_sample_data_ruby documented output' do
      hash = { 'Name' => 'sample1', 'Read1 [File]' => '/path/file.gz' }
      expect(Sample.serialize_key_value_ruby(hash)).to eq('{"Name"=>"sample1", "Read1 [File]"=>"/path/file.gz"}')
    end
  end
end
