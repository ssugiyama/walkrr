class Walk < ActiveRecord::Base
  after_save :set_length
  def set_length
    connection.execute("update walks set length = length_spheroid(PATH,'SPHEROID[\"WGS 84\",6378137,298.257223563]')/1000 where PATH is not NULL and id=" + self[:id].to_s)
  end

  def to_hash
    ar = %w(id date start end length).map do |col|
      [col , self.send(col)]
    end 
    Hash[*ar.flatten]
  end  
  
  def to_hash_with_path
    h = to_hash
    h[:path] = self.path.as_encoded_path
    h
  end
end
