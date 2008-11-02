class CreateWalks < ActiveRecord::Migration
  def self.up
    create_table :walks do |t|
      t.column "date", :date, :null => false
      t.column "start", :text, :null => false
      t.column "end", :text, :null => false
      t.column "length", :float
      t.column "path", :line_string, :srid => 4326
    end
    add_index "walks", ["path"], :name => "walks_path_index", :spatial=> true 
  end

  def self.down
    drop_table :walks
  end
end
