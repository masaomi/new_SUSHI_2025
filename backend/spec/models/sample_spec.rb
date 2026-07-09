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

    # Ruby String#inspect escapes `#` only when it introduces interpolation
    # (#{, #@, #$). Without this, an eval() reader (legacy SUSHI / btools) would
    # interpolate — a data-corruption and code-execution vector.
    it 'escapes # before {, @, $ to match Ruby Hash#to_s and defuse eval interpolation' do
      expect(Sample.serialize_key_value_ruby({ 'K' => 'a#{7+1}b' })).to eq('{"K"=>"a\\#{7+1}b"}')
      expect(Sample.serialize_key_value_ruby({ 'K' => 'x#@f' })).to eq('{"K"=>"x\\#@f"}')
      expect(Sample.serialize_key_value_ruby({ 'K' => 'y#$g' })).to eq('{"K"=>"y\\#$g"}')
      # a bare '#' (and '# ') is NOT escaped, exactly like Ruby
      expect(Sample.serialize_key_value_ruby({ 'K' => 'p # q' })).to eq('{"K"=>"p # q"}')
    end

    it 'is byte-identical to Ruby Hash#to_s for interpolation-bearing values' do
      %w[a#{1} x#@f y#$g plain ends# a#b].each do |v|
        expect(Sample.serialize_key_value_ruby({ 'Name' => v })).to eq({ 'Name' => v }.to_s)
      end
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

  # Priority-1c: pin the serializer against key_value strings observed VERBATIM in
  # a real legacy SUSHI database (legacy dev DB at masa_test_sushi_20260416, Ruby
  # 3.3.7). These are the byte-for-byte bytes the production DB stores and that
  # legacy / btools read back with eval(); the oracle must reproduce them exactly.
  # Verified: re-serializing the parsed hash reproduces all 6 real rows identically.
  describe 'legacy production format parity (real sample fixtures)' do
    # As stored (note the tag prefix form "[File]Read1", tag BEFORE the label,
    # which differs from the "Read1 [File]" form used elsewhere — both occur).
    REAL_LEGACY_KEY_VALUE = '{"Name"=>"sA", "[File]Read1"=>"p8888/data/a.fastq.gz"}'.freeze

    it 're-serializes the parsed real row to byte-identical stored bytes' do
      parsed = Sample.new(key_value: REAL_LEGACY_KEY_VALUE).to_hash
      expect(Sample.serialize_key_value_ruby(parsed)).to eq(REAL_LEGACY_KEY_VALUE)
    end

    it 'parses the real row preserving Name-first order and the tag-prefix key' do
      parsed = Sample.new(key_value: REAL_LEGACY_KEY_VALUE).to_hash
      expect(parsed).to eq('Name' => 'sA', '[File]Read1' => 'p8888/data/a.fastq.gz')
      expect(parsed.keys.first).to eq('Name')
    end
  end
end
