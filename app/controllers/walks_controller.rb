class WalksController < ApplicationController
  include GeoRuby::SimpleFeatures

  XMPS_SRID = 4301
  EARTH_RADIUS = 6370986
  DEFAULT_SRID = 4326
  DEG_TO_RAD = Math::PI/180
  def index
    year_range = ActiveRecord::Base.connection.select_one("select extract(year from min(date)) as min, extract(year from max(date)) as max from walks")
    @year_opts = [''] + (year_range['min'].to_i .. year_range['max'].to_i).to_a.reverse
    @month_opts = [''] + (1 .. 12).to_a
    id = params[:id]
    unless id.blank?
      walk = Walk.find(id)
      @walks = [walk]
      @default_path = walk.path.as_encoded_path
    end
  end

  def add_area
    latitude = params[:latitude].to_f
    longitude = params[:longitude].to_f
    point = Point.from_x_y(longitude, latitude, DEFAULT_SRID)
    @area = Area.find(:first, :conditions => ["st_contains(the_geom, :point)", {:point => point}])
  end

  def search
    radius = params[:radius]
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
      point = Point.from_x_y(longitude.to_f, latitude.to_f, DEFAULT_SRID)
#      sqls << "st_dwithin(transform(path, :srid), transform(:point, :srid), :distance)"
      dlat = radius.to_f / DEG_TO_RAD / EARTH_RADIUS
      dlon = dlat / Math.cos(latitude.to_f * DEG_TO_RAD)
      pll = Point.from_x_y(longitude.to_f-dlon, latitude.to_f-dlat, DEFAULT_SRID)
      pur = Point.from_x_y(longitude.to_f+dlon, latitude.to_f+dlat, DEFAULT_SRID)
      sqls << "st_makebox2d(:pll, :pur) && path and st_distance_sphere(path, :point) <= :radius"
      values.merge!({:radius => radius.to_f, :point => point,
        :pll => pll, :pur => pur
      })
    when "areas"
      sqls << "id in (select distinct id from walks inner join areas on jcode in (:areas) where path && the_geom and intersects(path, the_geom))"
      values.merge!({:areas =>params[:areas].split(/,/)})
    when "cross"
      path = LineString.from_encoded_path(params[:search_path], DEFAULT_SRID)
      sqls << "path && :path and intersects(path, :path)"
      values.merge!({:path => path})

    end
    conditions = [sqls.join(' and '), values]
    @items = Walk.paginate :page => params[:page], :select => "walks.*",  :conditions => conditions, :order => params[:order], :per_page => params[:per_page].to_i
    
    @message = "Hit #{@items.total_entries} item(s)"
  end

  # GETs should be safe (see http://www.w3.org/2001/tag/doc/whenToUseGet.html)
#  verify :method => :post, :only => [ :destroy, :create, :update ],
 #        :redirect_to => { :action => :list }


  def show
    ids = params[:id]
    @select = params[:select]
    unless ids.is_a? Array
      ids = [ids]
    end
    @walks = Walk.find(ids)
  end

  def save
    path = LineString.from_encoded_path( params[:save_path], DEFAULT_SRID)
    if params[:id].blank?
      #temporary hack for https://github.com/fragility/spatial_adapter/issues/26
      @walk = Walk.create(:date => params[:date], :start => params[:start], :end => params[:end])
      @walk.path = path
    else
      @walk = Walk.find(params[:id])      
      @walk.date = params[:date]
      @walk.start = params[:start]
      @walk.end = params[:end]
      @walk.path = path
    end
    @walk.save
  end

  def destroy
    @walk =  Walk.destroy(params[:id])
  end

  def export
    format = params[:format]
    format = "kml" unless format
    @walks = Walk.find(params[:id])
    case format
      when "kml"
      headers["Content-Type"] = "application/vnd.google-earth.kml+xml";
      headers["Content-Disposition"] = "attachment; filename=walks.kml";
      render :template => 'walks/export_kml.xml.erb'
    end
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
    render :template => 'walks/import.js.erb'
  end

  private
  
  def import_kml(content)
    puts 'contents:' + content
    doc = REXML::Document.new content
    doc.elements.collect("//LineString") do |elm|
      line_string = LineString.from_kml(elm.to_s)
      line_string.as_encoded_path
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
