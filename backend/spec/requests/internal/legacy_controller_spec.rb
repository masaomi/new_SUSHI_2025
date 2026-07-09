require 'rails_helper'

RSpec.describe 'Internal::Legacy (machine bridge)', type: :request do
  # A machine (static) token authorizes the whole internal surface.
  let!(:machine_token) { ApiToken.issue(name: 'job_manager', scope: [1001])[0] }

  def bearer(raw)
    { 'Authorization' => "Bearer #{raw}", 'CONTENT_TYPE' => 'application/json' }
  end

  def body
    JSON.parse(response.body)
  end

  describe 'authentication' do
    it 'returns 401 without a token' do
      get '/internal/legacy/jobs', params: { status: 'CREATED' }
      expect(response).to have_http_status(:unauthorized)
    end

    it 'returns 401 for an unknown token' do
      get '/internal/legacy/jobs', params: { status: 'CREATED' }, headers: bearer('bogus')
      expect(response).to have_http_status(:unauthorized)
    end

    it 'returns 403 for a user-principal token (bridge is machine-only)' do
      allow(FGCZ).to receive(:get_user_projects2).and_return(['p1001'])
      user_token = ApiToken.issue(name: 'u', principal: 'user', login: 'masaomi', ttl_days: 30)[0]
      get '/internal/legacy/jobs', params: { status: 'CREATED' }, headers: bearer(user_token)
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe 'GET /internal/legacy/jobs' do
    let(:ds)         { create(:data_set, user: nil) }
    let!(:created)   { create(:job, status: 'CREATED', submit_job_id: nil, data_set: ds) }
    let!(:waiting)   { create(:job, status: 'WAITING_FOR_DEPENDENCY', submit_job_id: nil, data_set: ds) }
    let!(:completed) { create(:job, status: 'COMPLETED', data_set: ds) }

    it 'filters by a comma-separated status list' do
      get '/internal/legacy/jobs',
          params: { status: 'CREATED,WAITING_FOR_DEPENDENCY' }, headers: bearer(machine_token)
      expect(response).to have_http_status(:ok)
      ids = body.map { |j| j['id'] }
      expect(ids).to contain_exactly(created.id, waiting.id)
    end

    it 'serializes the full legacy job contract' do
      get '/internal/legacy/jobs', params: { status: 'COMPLETED' }, headers: bearer(machine_token)
      job = body.first
      expect(job.keys).to contain_exactly(
        'id', 'submit_job_id', 'input_dataset_id', 'next_dataset_id', 'script_path',
        'stdout_path', 'stderr_path', 'submit_command', 'status', 'user', 'start_time', 'end_time'
      )
    end

    it 'returns 422 when status is missing' do
      get '/internal/legacy/jobs', headers: bearer(machine_token)
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'GET /internal/legacy/datasets/:id/jobs (dependency resolution)' do
    let!(:data_set) { create(:data_set, user: nil) }
    let!(:producer) { create(:job, status: 'SUBMITTED', submit_job_id: 4242, data_set: data_set) }

    it 'returns producing jobs (next_dataset_id = id) with the parent contract' do
      get "/internal/legacy/datasets/#{data_set.id}/jobs", headers: bearer(machine_token)
      expect(response).to have_http_status(:ok)
      expect(body.first.keys).to contain_exactly('id', 'submit_job_id', 'status')
      expect(body.first['submit_job_id']).to eq(4242)
    end

    it 'returns an empty list for a dataset with no producing jobs' do
      other = create(:data_set, user: nil)
      get "/internal/legacy/datasets/#{other.id}/jobs", headers: bearer(machine_token)
      expect(body).to eq([])
    end
  end

  describe 'PATCH /internal/legacy/jobs/:id' do
    let(:ds)  { create(:data_set, user: nil) }
    let!(:job) do
      create(:job, status: 'SUBMITTED', submit_job_id: nil, data_set: ds,
                   stdout_path: '/tmp/old.out', submit_command: 'sbatch old')
    end

    it 'writes only the fields present in the body' do
      patch "/internal/legacy/jobs/#{job.id}",
            params: { status: 'RUNNING', submit_job_id: 777 }.to_json, headers: bearer(machine_token)
      expect(response).to have_http_status(:ok)
      job.reload
      expect(job.status).to eq('RUNNING')
      expect(job.submit_job_id).to eq(777)
      # untouched fields remain
      expect(job.submit_command).to eq('sbatch old')
      expect(job.stdout_path).to eq('/tmp/old.out')
    end

    it 'clears a field when an explicit null is sent' do
      patch "/internal/legacy/jobs/#{job.id}",
            params: { stdout_path: nil }.to_json, headers: bearer(machine_token)
      expect(job.reload.stdout_path).to be_nil
    end

    it 'leaves a field unchanged when its key is absent' do
      patch "/internal/legacy/jobs/#{job.id}",
            params: { status: 'RUNNING' }.to_json, headers: bearer(machine_token)
      expect(job.reload.stdout_path).to eq('/tmp/old.out')
    end

    it 'parses ISO datetimes for start_time/end_time' do
      patch "/internal/legacy/jobs/#{job.id}",
            params: { start_time: '2026-07-08T10:00:00Z' }.to_json, headers: bearer(machine_token)
      expect(job.reload.start_time).to be_within(1.second).of(Time.zone.parse('2026-07-08T10:00:00Z'))
    end

    it 'ignores fields outside the patch whitelist' do
      original_next = job.next_dataset_id
      patch "/internal/legacy/jobs/#{job.id}",
            params: { next_dataset_id: 99999, script_path: '/tmp/injected.sh' }.to_json,
            headers: bearer(machine_token)
      job.reload
      expect(job.next_dataset_id).to eq(original_next)
      expect(job.script_path).not_to eq('/tmp/injected.sh')
    end

    it 'returns 404 for an unknown job' do
      patch '/internal/legacy/jobs/999999',
            params: { status: 'RUNNING' }.to_json, headers: bearer(machine_token)
      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'GeoUploader lookups' do
    let!(:project)  { create(:project, number: 1001) }
    let!(:root)     { create(:data_set, project: project, user: nil, bfabric_id: 5150) }
    let!(:child)    { create(:data_set, project: project, user: nil, parent_id: root.id) }

    it 'lists all datasets for a project' do
      get "/internal/legacy/projects/#{project.number}/datasets", headers: bearer(machine_token)
      expect(response).to have_http_status(:ok)
      ids = body.map { |d| d['id'] }
      expect(ids).to contain_exactly(root.id, child.id)
      expect(body.find { |d| d['id'] == child.id }['parent_id']).to eq(root.id)
    end

    it 'returns an empty list for an unknown project' do
      get '/internal/legacy/projects/424242/datasets', headers: bearer(machine_token)
      expect(body).to eq([])
    end

    it 'resolves a dataset id from a bfabric id' do
      get "/internal/legacy/datasets/by-bfabric/#{root.bfabric_id}", headers: bearer(machine_token)
      expect(body).to eq('dataset_id' => root.id)
    end

    it 'returns 404 for an unknown bfabric id' do
      get '/internal/legacy/datasets/by-bfabric/999999', headers: bearer(machine_token)
      expect(response).to have_http_status(:not_found)
    end

    it 'returns parent_id (present for a child)' do
      get "/internal/legacy/datasets/#{child.id}/parent", headers: bearer(machine_token)
      expect(body).to eq('parent_id' => root.id)
    end

    it 'returns null parent_id for a root dataset' do
      get "/internal/legacy/datasets/#{root.id}/parent", headers: bearer(machine_token)
      expect(body).to eq('parent_id' => nil)
    end

    it 'returns 404 parent for an unknown dataset' do
      get '/internal/legacy/datasets/999999/parent', headers: bearer(machine_token)
      expect(response).to have_http_status(:not_found)
    end

    it 'returns the owning project number' do
      get "/internal/legacy/datasets/#{root.id}/project", headers: bearer(machine_token)
      expect(body).to eq('project_number' => project.number)
    end

    it 'returns 404 project for an unknown dataset' do
      get '/internal/legacy/datasets/999999/project', headers: bearer(machine_token)
      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'GET /internal/legacy/datasets/:id/samples' do
    let!(:data_set) { create(:data_set, user: nil) }

    before do
      data_set.samples << Sample.new(key_value: Sample.serialize_key_value_ruby('Name' => 's1', 'Read1 [File]' => 'p1001/f1.fastq.gz'))
      data_set.samples << Sample.new(key_value: Sample.serialize_key_value_ruby('Name' => 's2', 'Read1 [File]' => 'p1001/f2.fastq.gz'))
    end

    it 'returns parsed sample rows in insertion order' do
      get "/internal/legacy/datasets/#{data_set.id}/samples", headers: bearer(machine_token)
      expect(response).to have_http_status(:ok)
      expect(body).to eq([
        { 'Name' => 's1', 'Read1 [File]' => 'p1001/f1.fastq.gz' },
        { 'Name' => 's2', 'Read1 [File]' => 'p1001/f2.fastq.gz' }
      ])
    end

    it 'returns an empty list for a dataset with no samples' do
      empty = create(:data_set, user: nil)
      get "/internal/legacy/datasets/#{empty.id}/samples", headers: bearer(machine_token)
      expect(body).to eq([])
    end
  end
end
