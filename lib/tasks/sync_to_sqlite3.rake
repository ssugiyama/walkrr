#require 'tasks/rails'

require 'sqlite3'


desc "export data to sqlite3"
task :export_sqlite3, :db,  :needs => :environment do |t, args|

  p args.db
  db = SQLite3::Database.new(args.db)
  mx = db.get_first_value('select max(id) from walks') || 0
  p mx
  
  rows = ActiveRecord::Base.connection.select_rows("select id, date, start, \"end\", length, st_askml(path) from walks where id > #{mx}")
  puts rows.inspect
  rows.each do |row|
    db.execute('insert into walks values(:id, :date, :start, :end, :length, :path)',
      {:id => row[0].to_i, :date => row[1], :start => row[2], :end => row[3], :length => row[4].to_f, :path => row[5]})
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
    ActiveRecord::Base.connection.execute("insert into walks values(#{row[0]}, '#{row[1]}', '#{row[2]}', '#{row[3]}', #{row[4]}, st_geomfromkml('#{row[5]}'))")
  end

  db.close
end

