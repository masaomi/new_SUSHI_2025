module ProjectAuthorizable
  extend ActiveSupport::Concern

  private

  def authorize_project!(project_number)
    return if AuthenticationHelper.authentication_skipped?

    unless current_user_project_numbers.include?(project_number.to_s)
      render json: { error: 'Forbidden' }, status: :forbidden
    end
  end

  def authorize_dataset!(dataset)
    authorize_project!(dataset.project.number.to_s)
  end

  def authorize_job!(job)
    dataset = DataSet.find_by(id: job.next_dataset_id) ||
              DataSet.find_by(id: job.input_dataset_id)

    unless dataset
      render json: { error: 'Forbidden' }, status: :forbidden
      return
    end

    authorize_project!(dataset.project.number.to_s)
  end

  def current_user_project_numbers
    @current_user_project_numbers ||= resolve_current_user_projects
  end

  def resolve_current_user_projects
    if defined?(FGCZ) && FGCZ.respond_to?(:get_user_projects2) && current_user
      begin
        FGCZ.get_user_projects2(current_user.login).map { |p| p.gsub(/p/, '').to_s }
      rescue => e
        Rails.logger.error("ProjectAuthorizable LDAP lookup failed: #{e.message}")
        fallback_all_projects
      end
    else
      if Rails.env.production?
        Rails.logger.warn("ProjectAuthorizable: LDAP unavailable in production — granting all projects")
      end
      fallback_all_projects
    end
  end

  def fallback_all_projects
    Project.pluck(:number).map(&:to_s)
  end
end
