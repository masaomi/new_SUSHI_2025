require 'rails_helper'

RSpec.describe DatasetRegistrationService, type: :service do
  let(:tsv) { "Name\tRead1 [File]\ns1\tp1001/f1.fastq.gz\ns2\tp1001/f2.fastq.gz\n" }

  describe '.validate' do
    it 'passes for a well-formed manifest with a [File] column' do
      result = described_class.validate(dataset_tsv: tsv, project_number: 1001, name: 'DS')
      expect(result[:ok]).to be(true)
      expect(result[:checks]).to include(hash_including(check: 'manifest', status: 'ok'))
    end

    it 'fails when no [File] column is present' do
      result = described_class.validate(dataset_tsv: "Name\tValue\ns1\t100\n", project_number: 1001, name: 'DS')
      expect(result[:ok]).to be(false)
      expect(result[:errors]).to include(hash_including(check: 'manifest'))
    end

    it 'fails when parent_id does not exist' do
      result = described_class.validate(dataset_tsv: tsv, project_number: 1001, name: 'DS', parent_id: 999999)
      expect(result[:ok]).to be(false)
      expect(result[:errors]).to include(hash_including(check: 'parent'))
    end

    it 'fails when the parent belongs to a different project' do
      other = create(:project, number: 2002)
      parent = create(:data_set, project: other)
      result = described_class.validate(dataset_tsv: tsv, project_number: 1001, name: 'DS', parent_id: parent.id)
      expect(result[:ok]).to be(false)
      expect(result[:errors]).to include(hash_including(check: 'parent'))
    end

    it 'reports idempotency status new then already_registered' do
      new_result = described_class.validate(dataset_tsv: tsv, project_number: 1001, name: 'DS')
      expect(new_result[:checks]).to include(hash_including(check: 'idempotency', status: 'new'))

      described_class.register(dataset_tsv: tsv, project_number: 1001, name: 'DS')
      again = described_class.validate(dataset_tsv: tsv, project_number: 1001, name: 'DS')
      expect(again[:checks]).to include(hash_including(check: 'idempotency', status: 'already_registered'))
    end
  end

  describe '.register' do
    it 'creates the dataset and samples with legacy Ruby key_value and sets md5' do
      result = described_class.register(dataset_tsv: tsv, project_number: 1001, name: 'DS')
      expect(result[:http]).to eq(200)
      expect(result[:body][:idempotent_replay]).to be(false)

      ds = DataSet.find(result[:body][:data_set_id])
      expect(ds.md5).to be_present
      expect(ds.samples.count).to eq(2)
      expect(ds.samples.first.key_value).to eq('{"Name"=>"s1", "Read1 [File]"=>"p1001/f1.fastq.gz"}')
      expect(ds.samples.first.to_hash).to eq('Name' => 's1', 'Read1 [File]' => 'p1001/f1.fastq.gz')
    end

    it 'is idempotent: replaying the same manifest returns the same id' do
      first = described_class.register(dataset_tsv: tsv, project_number: 1001, name: 'DS')
      expect {
        replay = described_class.register(dataset_tsv: tsv, project_number: 1001, name: 'DS')
        expect(replay[:body][:data_set_id]).to eq(first[:body][:data_set_id])
        expect(replay[:body][:idempotent_replay]).to be(true)
      }.not_to change(DataSet, :count)
    end

    it 'sets the owner to an existing user matching owner_login' do
      create(:user, login: 'masaomi')
      result = described_class.register(dataset_tsv: tsv, project_number: 1001, name: 'DS', owner_login: 'masaomi')
      ds = DataSet.find(result[:body][:data_set_id])
      expect(ds.user&.login).to eq('masaomi')
    end

    it 'leaves the dataset unowned when no user matches owner_login (fallback)' do
      result = described_class.register(dataset_tsv: tsv, project_number: 1001, name: 'DS', owner_login: 'ghost')
      expect(DataSet.find(result[:body][:data_set_id]).user).to be_nil
    end

    it 'returns 422 for an invalid manifest' do
      result = described_class.register(dataset_tsv: "Name\tValue\ns1\t100\n", project_number: 1001, name: 'DS')
      expect(result[:http]).to eq(422)
    end

    it 'matches the legacy sample_hash.to_s output on the current Ruby' do
      sample_hash = { 'Name' => 's1', 'Read1 [File]' => 'p1001/f1.fastq.gz' }
      expect(Sample.serialize_key_value_ruby(sample_hash)).to eq(sample_hash.to_s)
    end
  end

  describe '.set_bfabric_id' do
    let(:data_set) { create(:data_set, project: create(:project, number: 1001)) }

    it 'sets the id when unset' do
      result = described_class.set_bfabric_id(data_set, 555)
      expect(result[:http]).to eq(200)
      expect(data_set.reload.bfabric_id).to eq(555)
    end

    it 'is idempotent for the same value and conflicts for a different value' do
      described_class.set_bfabric_id(data_set, 555)
      expect(described_class.set_bfabric_id(data_set, 555)[:http]).to eq(200)
      expect(described_class.set_bfabric_id(data_set, 999)[:http]).to eq(409)
    end
  end

  describe '.deregister' do
    it 'removes the dataset and its samples' do
      result = described_class.register(dataset_tsv: tsv, project_number: 1001, name: 'DS')
      ds = DataSet.find(result[:body][:data_set_id])
      expect {
        described_class.deregister(ds)
      }.to change(DataSet, :count).by(-1).and change(Sample, :count).by(-2)
    end
  end
end
