#require 'tasks/rails'

require 'sqlite3'

desc "export data to sqlite3"
task :export_sqlite3, :db,  :needs => :environment do |t, args|

  p args.db
  db = SQLite3::Database.new(args.db)
  begin
    mx = db.get_first_value('select max(id) from walks') || 0
  rescue
    db.execute('create table walks (id integer primary key, date date, start text, end text, length number, path text)')
    db.execute('create index walks_date_index  on walks (date)')
    retry
  end
  
  walks = Walk.where("id > ?", mx)
  
  walks.each do |walk|
    db.execute('insert into walks values(:id, :date, :start, :end, :length, :path)',
      {:id => walk.id, :date => walk.date.to_s, :start => walk.start, :end => walk['end'], :length => walk.length, :path => walk.path.as_encoded_path})
  end
  db.close
end

desc "import data from sqlite3"
task :import_sqlite3, :db,  :needs => :environment do |t, args|

  mx = ActiveRecord::Base.connection.select_value("select max(id) from walks") || 0
  p mx
  db = SQLite3::Database.new(args.db)
  db.execute("select id, date, start, \"end\", length, path from walks where id > #{mx}") do |row|
    puts row.inspect
    walk = Walk.new(:id => row[0], :date => row[1], :start=> row[2], :end => row[3], :length => row[4].to_f, :path => LineString.from_encoded_path(row[5], WalksController::DEFAULT_SRID))
    walk.save!
  end

  db.close
end

