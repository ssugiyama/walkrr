class WalksController < ApplicationController
  include GeoRuby::SimpleFeatures

  XMPS_SRID = 4301
  
  def index
    @walks = []
    @areas = Area.find(:all, 
      :select => "pref||coalesce(city2,'')||coalesce(city1,'') as city, jcode",
      :conditions => "exists (select * from walks where the_geom && path and intersects(the_geom, path))",
      :order => "jcode"
    ).map{|area| [area.city, area.jcode]}
    year_range = ActiveRecord::Base.connection.select_one("select extract(year from min(date)) as min, extract(year from max(date)) as max from walks")
    @year_opts = [''] + (year_range['min'].to_i .. year_range['max'].to_i).to_a.reverse
    @month_opts = [''] + (1 .. 12).to_a
  end

  def search
    distance = params[:distance]
    latitude = params[:latitude]
    longitude = params[:longitude]
    year = params[:year]
    month = params[:month]
    sqls = []
    values = {}
    unless year.empty?
      sqls << 'extract(year from date) = :year'
      values[:year] = year
    end
    unless month.empty?
      sqls << 'extract(month from date) = :month'
      values[:month] = month
    end
    case params[:condition]
    when "neighbor"
      point = Point.from_x_y(longitude, latitude, DEFAULT_SRID)
      sqls << "expand(transform(:point, :srid), :distance) && transform(path, :srid) and distance(transform(path, :srid),transform(:point, :srid))  <= :distance"
      values.merge!({:point => point, :srid => PROJECTION_SRID, :distance => distance.to_f*1000, :point => point})
    when "areas"
      sqls << "id in (select distinct id from walks inner join areas on jcode in (:areas) where path && the_geom and intersects(path, the_geom))"
      values.merge!({:areas =>params[:areas]})
    when "cross"
      points = params[:search_path].split(",").map{|item| item.split(" ")}
      path = LineString.from_coordinates(points, DEFAULT_SRID)
      sqls << "path && :path and intersects(path, :path)"
      values.merge!({:path => path})

    end
    conditions = [sqls.join(' and '), values]

    @items = Walk.paginate :page => params[:page], :select => "walks.*",  :conditions => conditions, :order => params[:order], :per_page => params[:per_page].to_i
    @message = "Hit #{@items.total_entries} item(s)"
  end

  # GETs should be safe (see http://www.w3.org/2001/tag/doc/whenToUseGet.html)
  verify :method => :post, :only => [ :destroy, :create, :update ],
         :redirect_to => { :action => :list }


  def show
    @walk = Walk.find(params[:id])
  end

  def create
    points = params[:create_path].split(",").map{|item| item.split(" ")}
    path = LineString.from_coordinates(points, DEFAULT_SRID)
    @walk = Walk.new(:date => params[:date], :start => params[:start], :end => params[:end],
                    :path =>path)
    if @walk.save
      @walk = Walk.find(@walk[:id])
      @message = "create following data"
    else
      @message = "create failed"
    end
  end


  def destroy
    @walks =  params[:id].map{|id| Walk.destroy(id)}
    @message = "destroy following data"
  end
  
  def export_file
    @walks = Walk.find(params[:id])
    case params[:type]
    when "kml"
      headers["Content-Type"] = "application/vnd.google-earth.kml+xml";
      headers["Content-Disposition"] = "attachment; filename=walks.kml";
      srid = DEFAULT_SRID
      action = "export_kml"
    when "xmps"
      headers["Content-Type"] = "application/x-mapserver-xml";
      headers["Content-Disposition"] = "attachment; filename=walks.xmps";   
      srid = XMPS_SRID
      action = "export_xmps"
    end
    @walks.map{|walk| walk.path = transform_path(walk.path, srid)}
    render :action => action 
  end

  def import
    headers["Content-Type"] = "text/plain";
    file = params[:file]
    content = file.read
    @paths = case file.original_filename[/\.[^.]+$/]
    when ".kml"
      import_kml(content)         
    when ".xmps"
      import_xmps(content)       
    end
  end

  private
  
  def import_kml(content)

    doc = REXML::Document.new content
    doc.elements.collect("//LineString/coordinates") do |elm|
      elm.text.split(" ").map{|item| item.split(",").join(" ")}.join(",")
    end
      
  end   

  def coord_to_f(point, unit)
    case unit
    when "dmms"
      dm, m, ms = point.split("/"); 
      dm.to_f + m.to_f/60 + ms.to_f/3600000
    when "dms"
      dm, m, s = point.split("/"); 
      dm.to_f + m.to_f/60 + s.to_f/3600
    when "deg"
      point.to_f
    when "msec"
      point.to_f/3600000
    end
  end

  def transform_path(path, srid)
    Walk.find_by_sql(["select transform(?, ?) as path", path, srid])[0].path
  end

  def import_xmps(content)
    doc = REXML::Document.new content
    doc.elements("//polyline/locator/points").collect do |elm|
      coords = elm.text
      unit = elm.attributes["unit"]
      coords = coords.split(",").map{|item| coord_to_f(item, unit)}
      points = []
      while coords.length > 0 do
        lat = coords.shift
        lng = coords.shift
        points.push([lng, lat])
      end
      transform_path(LineString.from_coordinates(points, XMPS_SRID), DEFAULT_SRID).text_representation
    end
    
  end
  
end
