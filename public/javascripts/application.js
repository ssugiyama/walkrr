// Place your application-specific JavaScript functions and classes here
// This file is automatically included by javascript_include_tag :defaults

var Walkrr = function (){
    var defaultPos = new google.maps.LatLng(35.690,139.70);
    var defaultRadius = 500;
    var options = {
        zoom: 13,
        center: defaultPos,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDoubleClickZoom: true
    };
    var map = new google.maps.Map(document.getElementById("map"), options);
    var self = this;

    this.polylines = new Array();
    this.earthRadius = 6370986;

    this.map = map;
    this.selectedPolyline = null;
    this.generalStyle = {strokeColor : "#0000ff", strokeOpacity: 0.5};
    this.selectedStyle = {strokeColor : "#ff0000", strokeOpacity : 0.7};
    var circleOpts ={
      center : defaultPos,
      radius : defaultRadius
    };
    this.circle = new google.maps.Circle(circleOpts);
    var markerOpts = {
        position: defaultPos,
        draggable: true,
        map: this.map
    };
    this.marker = new google.maps.Marker(markerOpts);
    
    google.maps.event.addListener(this.marker, 'rightclick', function () {
        self.deletePoint();
    });
    this.endEditListener = google.maps.event.addListener(this.marker, 'click', function () {
        self.setSelectedPolyline(null);
    });
    google.maps.event.addListener(this.marker, 'dragstart', function (event) {
        self.addPoint(event);
    });
    google.maps.event.addListener(this.marker, 'drag', function (event) {
        self.movePoint(event);
    });
    google.maps.event.addListener(this.marker, 'dragend', function () {
        self.showLength();
    });
    google.maps.event.addListener(this.map, 'dblclick' , function (event) {
       self.marker.setPosition(event.latLng);
       self.addPoint(event);
       self.movePoint(event);
       self.showLength();
    });
    jQuery("#editing_label").hide();
    jQuery(".pagination a").live('click', function() {
      var el = jQuery(this);

      jQuery.get(el.attr('href'), null, null, 'script');
      return false;

    });
    jQuery("#date").datepicker({dateFormat: 'yy-mm-dd'});
    jQuery("#tabs").tabs();
    jQuery("#conditionBox input").change(function (){

        if(jQuery("#condition_neighbor").attr("checked")){
            jQuery("#neighborBox").show();
            self.circle.setMap(self.map);
            self.circle.setCenter(self.marker.getPosition());
        }
        else {
          jQuery("#neighborBox").hide();
          self.circle.setMap(null);
        }
        if(jQuery("#condition_areas").attr("checked")) jQuery("#areasBox").show();
        else jQuery("#areasBox").hide();
    }).change();
    jQuery("#radius").val(String(defaultRadius));
    jQuery("#radius").change(function (){
        self.circle.setRadius(parseFloat($(this).val()));
    });
    var frame = jQuery("#import_frame");

    frame.load(function () {
        self
        .getImportPath(frame);
    });
}

var walk;


jQuery(document).ready(function (){
    walk = new Walkrr();
});

Walkrr.prototype = {

    deletePath : function () {
        if(this.selectedPolyline != null){
            this.selectedPolyline.setMap(null);
            this.setSelectedPolyline(null);
        }
        var newPolylines = [];
        for (var i = 0; i < this.polylines.length; i++) {
            var pl = this.polylines[i];
            if(pl.getMap()) newPolylines.push(pl);
        }        
        this.polylines = newPolylines;
    },
    deleteAll : function () {
        for (var i = 0; i < this.polylines.length; i++) {
            var pl = this.polylines[i];
            pl.setMap(null);
        }
        this.polylines = [];
    },

    retrievePointsFromPath : function (id){
        if(this.selectedPolyline == null) return;
        var points = [];
        this.selectedPolyline.getPath().forEach(function (elem, index){
            points.push(elem.lng() + " " + elem.lat());
        });

        jQuery(id).val(points.join(","));
    },
    showPath : function (str) {
    //    clearPath();
        var pts = str.split(",");
        var points = [];
        var bounds = this.map.getBounds();
        var needsPan = true;
        for(var i = 0; i < pts.length; i++){
            var pt = pts[i];
            var ps = pt.split(" ");
            if(ps.length < 2) continue;
            var point = new google.maps.LatLng(ps[1], ps[0]);
            points.push(point);
            if(needsPan && bounds.contains(point)) needsPan = false;
        }
        this.addPolyline(points);
        if (needsPan) this.map.panTo(points[0]);
    },

    addPolyline : function (points){
    //    if(polyline != null){
    //        map.removeOverlay(polyline);
    //    }
        
        var pl = new google.maps.Polyline(this.generalStyle);
        pl.setPath(points);
        pl.setMap(this.map);
        this.polylines.push(pl);
//        this.setSelectedPolylne(pl);
        var self = this;

        google.maps.event.addListener(pl, 'click', function () {
            self.setSelectedPolyline(pl);
        });
        return pl;

    },
    setSelectedPolyline : function (pl){
    
        if (this.selectedPolyline){
            this.selectedPolyline.setOptions(this.generalStyle);
        }
        this.selectedPolyline = pl;
        if (this.selectedPolyline) {
            jQuery("#editing_label").show();
            this.selectedPolyline.setOptions(this.selectedStyle);
            var path = this.selectedPolyline.getPath();

            var len = path.getLength();
            if(len > 0) {
                this.marker.setPosition(path.getAt(len-1));
            }
            this.showLength();
        }
        else{
            jQuery("#editing_label").hide();
        }
      
    },

    newPath : function () {
        var position = this.marker.getPosition();
        var pl = this.addPolyline([position]);
        this.setSelectedPolyline(pl);
    },
    addPoint : function (event) {
        if (! this.selectedPolyline) return;
        var path = this.selectedPolyline.getPath();
        path.push(event.latLng);
    },
    movePoint : function (event) {
        
        if (this.selectedPolyline) {
            var path = this.selectedPolyline.getPath();
            path.pop();
            path.push(event.latLng);
        }
        else if(this.circle.getMap()){
            this.circle.setCenter(event.latLng);
        }
    },
    deletePoint : function () {
        if (! this.selectedPolyline) return;
        var path = this.selectedPolyline.getPath();
        var len = path.getLength();
        if(len > 1) {
            path.pop();
            this.marker.setPosition(path.getAt(len-2));
        }
        this.showLength();
    },
    showLength : function (){
        var len;
        if(this.selectedPolyline != null){

            len = Math.round(this.length(this.selectedPolyline.getPath()));
        }
        else{
            len = 0;
        }
        
        jQuery("#length").text(len);
    },
    setLatLng : function (){
        var pt = this.circle.getCenter();
        jQuery("#latitude").val(pt.lat());
        jQuery("#longitude").val(pt.lng());
    },
    length : function (path){
        var len = path.getLength();
        var sum = 0;
        var d2r = Math.PI/180;
        for (var i = 1; i < len; i++){
            var p0 = path.getAt(i-1);
            var p1 = path.getAt(i);
            var x = (p0.lng()-p1.lng())*d2r*Math.cos((p0.lat()+p1.lat())/2*d2r);
            var y = (p0.lat()-p1.lat())*d2r;
            sum += Math.sqrt(x*x + y*y)*this.earthRadius;

        }
        return sum;
    },
    getImportPath : function (frame){
        var pres = frame.contents().find("pre");
        var text = pres.text();
        eval(text);
    },
    importFile : function (){

        var form = jQuery("#import_form");

        form.submit();
    }
}




