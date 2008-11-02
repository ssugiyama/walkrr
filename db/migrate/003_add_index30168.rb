class AddIndex30168 < ActiveRecord::Migration
  def self.up
    add_index "walks", ["transform(path,30168)"], :name => "walks_path_index_30168", :spatial=> true
  end

  def self.down
    remove_index :walks, :name => :walks_path_index_30168
  end
end
