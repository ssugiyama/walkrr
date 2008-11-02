class Walk < ActiveRecord::Base
  after_save :set_length
  def set_length
    connection.execute("update walks set length = length_spheroid(PATH,'SPHEROID[\"WGS 84\",6378137,298.257223563]')/1000 where id=" + self[:id].to_s)
  end
  
end
