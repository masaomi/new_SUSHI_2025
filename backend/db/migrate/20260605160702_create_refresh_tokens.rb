class CreateRefreshTokens < ActiveRecord::Migration[8.0]
  def change
    create_table :refresh_tokens do |t|
      t.string :token_hash, null: false
      t.references :user, null: false, foreign_key: true, type: :integer
      t.datetime :expires_at, null: false
      t.boolean :revoked, null: false, default: false
      t.timestamps
    end

    add_index :refresh_tokens, :token_hash, unique: true
  end
end
