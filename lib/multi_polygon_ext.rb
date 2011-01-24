module GeoRuby
  module SimpleFeatures
    class MultiPolygon

      def as_encoded_paths
        map {|polygon|  polygon[0].as_encoded_path }.join(" ") 
      end

    end
  end
end
