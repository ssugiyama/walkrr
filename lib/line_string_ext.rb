module RGeo
  module Feature
    module LineString
      def xmps_poslist
        map {|point| "#{point.y},#{point.x}"}.join(",")
      end

      def as_encoded_path
        prevx = prevy = 0
        points.map do |point|
          s = GeometryEncodeUtil.encode_float(point.y-prevy) + GeometryEncodeUtil.encode_float(point.x-prevx)
          prevx = point.x
          prevy = point.y
          s
        end.join
      end

    end
  end
end
