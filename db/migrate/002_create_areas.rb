class CreateAreas < ActiveRecord::Migration
  def self.up
    create_table :areas, :primary_key => "gid" do |t|
      t.column "pref", :string, :limit => 20
      t.column "city1", :string, :limit => 20
      t.column "city2", :string, :limit => 20
      t.column "town1", :string, :limit => 20
      t.column "town2", :string, :limit => 20
      t.column "jcode", :integer
      t.column "p_num", :decimal
      t.column "h_num", :decimal
      t.column "flag1", :integer
      t.column "flag2", :integer
      t.column "the_geom", :multi_polygon, :srid => 4326
    end
      add_index :areas, ["the_geom"], :name => "areas_geom_index", :spatial=> true 
  end

  def self.down
    drop_table :areas
  end
end
