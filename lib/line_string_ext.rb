module GeoRuby
  module SimpleFeatures
    class LineString
      def xmps_poslist
        map {|point| "#{point.y},#{point.x}"}.join(",")
      end

      def as_encoded_path
        prevx = prevy = 0
        map do |point|
          s = GeometryEncodeUtil.encode_float(point.y-prevy) + GeometryEncodeUtil.encode_float(point.x-prevx)
          prevx = point.x
          prevy = point.y
          s
        end.join
      end

      def self.from_encoded_path(str, srid=DEFAULT_SRID)
        fs = GeometryEncodeUtil.decode_floats(str)
        points = []
        p1 = p2 = 0
        while f1 = fs.shift do
          f2 = fs.shift
          p1 += f1
          p2 += f2
          p = Point.from_x_y(p2, p1, srid)
          points << p
        end
        line_string = new(srid, false, false)
        line_string.concat(points)
        line_string
      end

    end
  end
end
