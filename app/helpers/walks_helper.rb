module WalksHelper
  def to_tbody(walks)
    index = 0
    styles = ["even", "odd"]
    walks.map do |walk|
      tr = "<tr class='#{styles[index]}'>"
      index = 1 - index
      if !walk.frozen?
        tr +=  "<td><input type='checkbox' name='id[]' value='#{walk.id}' /></td>"
        tr += "<td>" + link_to_remote(walk.date, :url => { :action => "show", :id => walk.id }) + "</td>"
      else
        tr += "<td></td>"
        tr += "<td>#{walk.date}</td>"
      end
      tr += "<td>#{walk.start}</td><td>#{walk.end}</td><td style='text-align: right;'>#{"%.1f" % walk.length}</td>"
      tr += "</tr>"
      tr
    end.join
  end
  
end
