// Place your application-specific JavaScript functions and classes here
// This file is automatically included by javascript_include_tag :defaults

var Walkrr = function (){
    var defaultPos = new google.maps.LatLng(35.690,139.70);
    var options = {
        zoom: 13,
        center: defaultPos,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDoubleClickZoom: true
    };
    var map = new google.maps.Map(document.getElementById("map"), options);
//    map.addMapType(G_PHYSICAL_MAP);
//    map.removeMapType(G_HYBRID_MAP);
//    map.enableGoogleBar();
//    map.disableDoubleClickZoom();
//    map.enableScrollWheelZoom();
//    map.addControl(new GLargeMapControl());
//    map.addControl(new GMenuMapTypeControl());



    var self = this;

    google.maps.event.addListener(map, 'dblclick', function (event) {
        self.handleDblclick(event);
    })
/*    GEvent.addListener(map, "click", function (overlay, point){
        self.handleClick(overlay, point);
    });
    GEvent.addListener(map, "singlerightclick", function (point, src, overlay) {
        self.handleRightClick(point, src, overlay);
    });
*/
    this.polylines = new Array();
    jQuery(".pagination a").live('click', function() {
      var el = jQuery(this);

      jQuery.get(el.attr('href'), null, null, 'script');
      return false;

    });
    jQuery("#date").datepicker({dateFormat: 'yy-mm-dd'});
    jQuery("#tabs").tabs();
    jQuery("#conditionBox input").change(function (){

        if(jQuery("#condition_neighbor").attr("checked")) jQuery("#neighborBox").show();
        else jQuery("#neighborBox").hide();
        if(jQuery("#condition_areas").attr("checked")) jQuery("#areasBox").show();
        else jQuery("#areasBox").hide();
    }).change();

    this.map = map;
    this.selectedPolyline = null;
    this.generalStyle = {strokeColor : "#0000ff", strokeOpacity: 0.5};
    this.selectedStyle = {strokeColor : "#ff0000", strokeOpacity : 0.7};
    this.panoramaIndex = 0;
    this.addMarker();
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
    addMarker : function  (){
        var markerOpts = {
            position: this.map.getCenter(),
            draggable: true
        };
        this.marker = new google.maps.Marker(markerOpts)
        this.marker.setMap(this.map);
    },
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
        for(var i = 0; i < pts.length; i++){
            var pt = pts[i];
            var ps = pt.split(" ");
            if(ps.length < 2) continue;
            points.push(new google.maps.LatLng(ps[1], ps[0]));
        }
        this.addPolyline(points);
        this.map.panTo(points[0]);
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
        var self = this;
        if (this.selectedPolyline == null && pl != null){
            this.addPointListener = google.maps.event.addListener(this.map, 'click', function (event){
                var path = self.selectedPolyline.getPath();
                path.push(event.latLng);
                self.marker.setPosition(event.latLng);
            });
            this.deletePointListener = google.maps.event.addListener(this.marker, 'rightclick', function () {
                var path = self.selectedPolyline.getPath();
                var len = path.getLength();
                if(len > 0) {
                    path.pop();
                    if (len > 1) self.marker.setPosition(path.getAt(len-2));
                }
            });
            this.endEditListener = google.maps.event.addListener(this.marker, 'click', function () {
                self.setSelectedPolyline(null);
            });
            this.dragPointListener = google.maps.event.addListener(this.marker, 'drag', function (event) {
                var path = self.selectedPolyline.getPath();
                var len = path.getLength();
                if(len > 0) {
                    path.pop();
                    path.push(event.latLng);
                }
            });
        }
        else if (this.selectedPolyline != null && pl == null) {
            google.maps.event.removeListener(this.addPointListener);
            google.maps.event.removeListener(this.deletePointListener);
            google.maps.event.removeListener(this.dragPointListener);
            google.maps.event.removeListener(this.endEditListener);
        }
        if (this.selectedPolyline){
            this.selectedPolyline.setOptions(this.generalStyle);
        }
        this.selectedPolyline = pl;
        if (this.selectedPolyline) {
            this.selectedPolyline.setOptions(this.selectedStyle);
            var path = this.selectedPolyline.getPath();
            var len = path.getLength();
            if(len > 0) this.marker.setPosition(path.getAt(len-1));
        }
 //       this.showLength();
    },
    handleDblclick : function (event){      
        if(!this.marker) this.addMarker();
        this.marker.setPosition(event.latLng);
    },

    newPath : function () {
        var pl = this.addPolyline([]);
        this.setSelectedPolyline(pl);
        
    },
    showLength : function (){

        if(this.selectedPolyline != null){

            var len = Math.round(this.selectedPolyline.getLength());
        }
        else{
            len = 0;
        }
        
        jQuery("#length").text(len);
    },
    setLatLng : function (){
        if(!this.marker) this.addMarker();
        var pt = this.marker.getPosition();
        jQuery("#latitude").val(pt.lat());
        jQuery("#longitude").val(pt.lng());
    },
    length : function (){
        if(this.selectedPolyline == null){
            return 0;
        }
        else{
            return Math.round(this.selectedPolyline.getLength());
        }
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




