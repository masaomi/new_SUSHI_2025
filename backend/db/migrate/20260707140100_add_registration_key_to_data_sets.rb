class AddRegistrationKeyToDataSets < ActiveRecord::Migration[8.0]
  # Idempotency key for the machine-callable registration API: a composed
  # SHA-256 fingerprint of (canonical manifest, project_number, name, parent_id).
  # A re-POST of the same content under the same caller context is a replay.
  # Additive only (per db-stability-additive-only); nullable so existing rows
  # and other registration paths are unaffected.
  def change
    add_column :data_sets, :registration_key, :string
    add_index  :data_sets, :registration_key, unique: true
  end
end
