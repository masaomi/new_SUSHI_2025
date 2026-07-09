# Read model for the legacy SUSHI `projects` table (see LegacyRecord).
module Legacy
  class Project < LegacyRecord
    self.table_name = 'projects'

    has_many :data_sets, class_name: 'Legacy::DataSet', foreign_key: :project_id
  end
end
