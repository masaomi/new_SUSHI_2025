require 'json'

# Machine-to-machine "internal bridge" for the legacy SUSHI schema. Ported from
# Ronald's FastAPI /internal/legacy/* surface (backend_python) so background
# services reach New SUSHI by base-URL swap instead of a direct DB connection:
#
#   job_manager  → poll jobs by status, resolve SLURM dependencies, patch job rows
#   GeoUploader  → list a project's datasets, resolve bfabric-id/parent/project,
#                  read parsed sample rows
#
# Security posture (differs from Ronald, deliberately):
#   Ronald mounts /internal behind get_machine_caller, which is a NO-OP stub
#   ("service=anonymous") — i.e. unauthenticated. Per the priority-1b directive
#   (no unauthenticated DB access), this surface is bearer-only and fail-closed
#   via a STATIC ApiToken (a machine principal). User-principal tokens are
#   rejected (403): these callers are infrastructure daemons, not people.
#
#   No per-project scoping is applied here: job_manager polls jobs system-wide
#   and GeoUploader reads across projects, so the internal bridge authorizes any
#   valid static machine token for the whole surface (one trusted infra token).
#   This is the validation-oracle re-implementation of the contract Ronald leads
#   on; it does not couple to the legacy MariaDB (works against the app DB).
module Internal
  class LegacyController < ActionController::Base
    protect_from_forgery with: :null_session

    before_action :require_static_machine_token

    # Fields job_manager may write on a state transition. Mirrors Ronald's
    # PatchJobRequest exactly; anything else in the body is ignored.
    PATCHABLE_JOB_FIELDS = %w[
      status submit_job_id submit_command stdout_path stderr_path start_time end_time
    ].freeze

    # GET /internal/legacy/jobs?status=CREATED,WAITING_FOR_DEPENDENCY
    # job_manager polls this each daemon iteration to find jobs to submit/update.
    def jobs
      statuses = params[:status].to_s.split(',').map(&:strip).reject(&:empty?)
      if statuses.empty?
        render json: { error: 'status query parameter is required' }, status: :unprocessable_entity
        return
      end
      rows = Job.where(status: statuses).order(:id)
      render json: rows.map { |j| job_json(j) }, status: :ok
    end

    # GET /internal/legacy/datasets/:dataset_id/jobs
    # Jobs that produce a given dataset (next_dataset_id = dataset_id), used by
    # job_manager to build the SLURM --dependency chain. Empty list if none.
    def dataset_jobs
      rows = Job.where(next_dataset_id: params[:dataset_id]).order(:id)
      render json: rows.map { |j| parent_job_json(j) }, status: :ok
    end

    # PATCH /internal/legacy/jobs/:id
    # Partial update. Only keys PRESENT in the JSON body are written; a present
    # key with an explicit null clears the column; an absent key is left as-is
    # (mirrors Ronald's model_dump(exclude_unset=True)).
    def patch_job
      job = Job.find_by(id: params[:id])
      unless job
        render json: { error: "job #{params[:id]} not found" }, status: :not_found
        return
      end

      attrs = {}
      PATCHABLE_JOB_FIELDS.each do |field|
        next unless json_body.key?(field)
        attrs[field] = coerce_job_field(field, json_body[field])
      end

      job.update!(attrs) unless attrs.empty?
      render json: job_json(job.reload), status: :ok
    end

    # GET /internal/legacy/projects/:project_number/datasets
    # All datasets for a project (GeoUploader jsTree selector). Empty list if the
    # project does not exist.
    def project_datasets
      project = Project.find_by(number: params[:project_number])
      rows = project ? DataSet.where(project_id: project.id).order(:id) : DataSet.none
      render json: rows.map { |d| { id: d.id, name: d.name, parent_id: d.parent_id } }, status: :ok
    end

    # GET /internal/legacy/datasets/by-bfabric/:bfabric_id
    # SUSHI dataset id for a B-Fabric dataset id (GeoUploader login redirect).
    def dataset_by_bfabric
      data_set = DataSet.find_by(bfabric_id: params[:bfabric_id])
      unless data_set
        render json: { error: "dataset for bfabric_id #{params[:bfabric_id]} not found" }, status: :not_found
        return
      end
      render json: { dataset_id: data_set.id }, status: :ok
    end

    # GET /internal/legacy/datasets/:dataset_id/parent
    # parent_id is null for a root dataset; 404 only if the dataset is absent.
    def dataset_parent
      data_set = DataSet.find_by(id: params[:dataset_id])
      unless data_set
        render json: { error: "dataset #{params[:dataset_id]} not found" }, status: :not_found
        return
      end
      render json: { parent_id: data_set.parent_id }, status: :ok
    end

    # GET /internal/legacy/datasets/:dataset_id/project
    # Owning project number. 404 if the dataset is absent or has no project
    # (matches Ronald's inner join semantics).
    def dataset_project
      data_set = DataSet.find_by(id: params[:dataset_id])
      project = data_set&.project
      unless project
        render json: { error: "dataset #{params[:dataset_id]} not found" }, status: :not_found
        return
      end
      render json: { project_number: project.number }, status: :ok
    end

    # GET /internal/legacy/datasets/:dataset_id/samples
    # Parsed sample rows (Ruby Hash#inspect key_value → plain hashes). Empty list
    # if the dataset has no samples (matches Ronald: queries samples, not dataset).
    def dataset_samples
      rows = Sample.where(data_set_id: params[:dataset_id]).order(:id)
      render json: rows.map(&:to_hash), status: :ok
    end

    private

    def require_static_machine_token
      @api_token = ApiToken.authenticate(bearer_token)
      unless @api_token
        render json: { error: 'unauthorized' }, status: :unauthorized
        return
      end
      return if @api_token.static?

      render json: { error: 'internal bridge requires a machine token' }, status: :forbidden
    end

    def bearer_token
      header = request.headers['Authorization'].to_s
      header[/\ABearer\s+(.+)\z/i, 1]
    end

    def coerce_job_field(field, value)
      case field
      when 'submit_job_id'
        value.nil? ? nil : value.to_i
      when 'start_time', 'end_time'
        value.nil? ? nil : Time.zone.parse(value.to_s)
      else
        value
      end
    end

    def job_json(job)
      {
        id: job.id,
        submit_job_id: job.submit_job_id,
        input_dataset_id: job.input_dataset_id,
        next_dataset_id: job.next_dataset_id,
        script_path: job.script_path,
        stdout_path: job.stdout_path,
        stderr_path: job.stderr_path,
        submit_command: job.submit_command,
        status: job.status,
        user: job.user,
        start_time: job.start_time&.iso8601,
        end_time: job.end_time&.iso8601
      }
    end

    def parent_job_json(job)
      { id: job.id, submit_job_id: job.submit_job_id, status: job.status }
    end

    def json_body
      @json_body ||= begin
        raw = request.body.read
        raw.to_s.empty? ? {} : JSON.parse(raw)
      rescue JSON::ParserError
        {}
      end
    end
  end
end
