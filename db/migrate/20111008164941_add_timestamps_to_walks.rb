class AddTimestampsToWalks < ActiveRecord::Migration
  def change
    add_column :walks, :created_at, :timestamp
    add_column :walks, :updated_at, :timestamp
  end
end
