module RGeo
  module Feature
    module MultiPolygon

      def as_encoded_paths
        map {|polygon|  polygon.exterior_ring.as_encoded_path }.join(" ") 
      end

    end
  end
end
