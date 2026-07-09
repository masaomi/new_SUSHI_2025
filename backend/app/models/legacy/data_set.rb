# Read model for the legacy SUSHI `data_sets` table (see LegacyRecord).
module Legacy
  class DataSet < LegacyRecord
    self.table_name = 'data_sets'

    has_many :samples, class_name: 'Legacy::Sample', foreign_key: :data_set_id
    belongs_to :project, class_name: 'Legacy::Project', optional: true
  end
end
