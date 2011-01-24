class CreateWalks < ActiveRecord::Migration
  def self.up
    create_table :walks do |t|
      t.column "date", :date, :null => false
      t.column "start", :text, :null => false
      t.column "end", :text, :null => false
      t.column "length", :float
      t.column "path", :line_string, :srid => WalksController::DEFAULT_SRID
    end
    add_index "walks", ["path"], :name => "walks_path_index", :spatial=> true 
#    add_index "walks", ["transform(path,#{PROJECTION_SRID})"], :name => "walks_path_index_projection", :spatial=> true
  end

  def self.down
    drop_table :walks
  end
end
