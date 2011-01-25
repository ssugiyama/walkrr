module GeometryEncodeUtil
  module_function
  def encode_float(f)
    n = (f*100000).round
    n <<= 1
    n = ~n if n < 0
    ar = []
    begin
      k = n & 0x1F
      n >>= 5
      ar.push(k)
    end while n > 0
    0.upto(ar.size-1) do |i|
      ar[i] |= 0x20 if i < ar.size-1
      ar[i] += 63
    end
    ar.pack("C*")
  end

  def decode_floats(s)
    fs = []
    ar = s.unpack("C*")
    n = j = 0
    ar.each do |k|
      k -= 63
      is_last = (k & 0x20 == 0)
      k &= 0x1f
      n |= (k << (j*5))
      if is_last
        fs << ((n >> 1)*(1 - 2*(n & 1)) - (n & 1))/100000.0
        n = j = 0
      else
        j += 1
      end
    end
    fs
  end
end
