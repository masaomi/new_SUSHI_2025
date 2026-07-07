class CreateApiTokens < ActiveRecord::Migration[8.0]
  # Per-caller bearer token for the machine-callable /v1 registration API.
  # A token is either `static` (authorized against the stored project-number
  # array `scope`, frozen at issue) or `user` (LDAP-bound; authorized live
  # against the login's current FGCZ project membership). Ported from legacy
  # SUSHI (uzh/sushi) api_tokens design v0.7; additive (new table).
  def change
    create_table :api_tokens do |t|
      t.string   :token_hash, null: false
      t.string   :name
      t.text     :scope                                   # serialized array of project numbers (static)
      t.datetime :expires_at
      t.datetime :revoked_at
      t.string   :principal, null: false, default: "static"
      t.string   :login                                    # LDAP login (user principal)
      t.timestamps
    end
    add_index :api_tokens, :token_hash, unique: true
  end
end
