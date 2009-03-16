// Place your application-specific JavaScript functions and classes here
// This file is automatically included by javascript_include_tag :defaults

var Walkrr = function (){
    var map = new GMap2(document.getElementById("map"));
    map.addMapType(G_PHYSICAL_MAP);
    map.removeMapType(G_HYBRID_MAP);
    map.enableGoogleBar();
    map.disableDoubleClickZoom();
//    map.enableScrollWheelZoom();
    map.addControl(new GLargeMapControl());
    map.addControl(new GMenuMapTypeControl());
    this.streetView = new GStreetviewPanorama($("#panorama").get(0));
    this.client = new GStreetviewClient();
    var pt = new GLatLng(35.690,139.700);
    map.setCenter(pt, 13);
    
    GEvent.addListener(map, "click", this.handleClick);
    GEvent.addListener(map, "singlerightclick", this.handleRightClick);

    this.points = new Array();
    $(".pagination a").live('click', function() {
      var el = $(this);

      $.get(el.attr('href'), null, null, 'script');
      return false;

    });
    $("#date").datepicker({ dateFormat: 'yy-mm-dd' });
    $("#tabs").tabs();
    $("#conditionBox input").change(function (){

        if($("#condition_neighbor").attr("checked")) $("#neighborBox").show();
        else $("#neighborBox").hide();
        if($("#condition_areas").attr("checked")) $("#areasBox").show();
        else $("#areasBox").hide();
    }).change();
    this.map = map;
    this.selectedPolyline = null;
    this.isDrawing = false;
    this.generalStyle = { color : "#0000ff"};
    this.selectedStyle = { color : "#ff0000", opacity : 0.5};
    this.panoramaIndex = 0;
    this.addMarker();
}

var walk;


$(document).ready(function (){
    //    google.load("maps", "2", {"locale" : "ja_JP"});
    walk = new Walkrr();
});

Walkrr.prototype = {
    addMarker : function  (){
        this.marker = new GMarker(this.map.getCenter());
        this.map.addOverlay(this.marker);
    },
    deletePath : function () {

        if(this.selectedPolyline != null){
            this.map.removeOverlay(this.selectedPolyline);
            this.selectedPolyline = null;
        }
        this.isDrawing = false;
    },
    deleteAll : function () {
        this.map.clearOverlays();
        this.selectedPolyline = null;
        this.marker = null;
        this.isDrawing = false;

    },
    getPoints : function () {
        if(this.selectedPolyline == null) return [];
        var points = [];
        var count = this.selectedPolyline.getVertexCount();
        for (var i = 0; i < count; i++){
            var vertex = this.selectedPolyline.getVertex(i);
            points.push(vertex)
        }
        return points;
    },
    retrievePointsFromPath : function (id){
        if(this.selectedPolyline == null) return;
        var points = [];
        var count = this.selectedPolyline.getVertexCount();
        for (var i = 0; i < count; i++){
            var vertex = this.selectedPolyline.getVertex(i);
            points.push(vertex.lng() + " " + vertex.lat())
        }

        $(id).val(points.join(","));
    },
    showPath : function (str) {
    //    clearPath();
        var pts = str.split(",");
        var points = [];
        for(var i = 0; i < pts.length; i++){
            var pt = pts[i];
            var ps = pt.split(" ");
            if(ps.length < 2) continue;
            points.push(new GLatLng(ps[1], ps[0]));
        }
        this.addPolyline(points);
        this.map.panTo(this.selectedPolyline.getBounds().getCenter());
    },
    getYaw : function (pt1, pt2){
        var ret = Math.atan2((pt2.lng() - pt1.lng())*Math.cos(pt1.latRadians()), pt2.lat() - pt1.lat())*180/Math.PI;
    //    alert("(" + pt1.lng().toString() + "," + pt1.lat().toString()+ ")-(" + pt2.lng().toString() + ","+ pt2.lat().toString() + ")=" + ret);
        return ret;
    },
    showPanorama : function (pt1, pt2) {
        $("#panorama").show();

        var yaw, pov;
        if(pt2){
            yaw = getYaw(pt1, pt2);
        }
        pov = yaw?{yaw : yaw}:null;
        this.client.getNearestPanoramaLatLng(pt1, function (pt){
            this.streetView.setLocationAndPOV(pt, pov);
            this.marker.setLatLng(pt);
            this.map.panTo(pt);
        });

    },

    nearestPanorama : function (){
        var pt = this.marker.getLatLng();
        this.showPanorama(pt);
    },
    nextPanorama : function (){
        var pt1, pt2;
        if(!this.selectedPolyline) return;

        var count = this.selectedPolyline.getVertexCount();
        if(this.panoramaIndex+1 >= count) return;
        this.panoramaIndex++;
        pt1 = this.selectedPolyline.getVertex(this.panoramaIndex);
        pt2 = (this.panoramaIndex+1 < count)?this.selectedPolyline.getVertex(this.panoramaIndex+1):null;
        this.showPanorama(pt1, pt2);
    },
    prevPanorama : function (){
        var pt1, pt2;
        if(!this.selectedPolyline) return;

        if(this.panoramaIndex <= 0) return;
        this.panoramaIndex--;
        pt1 = this.selectedPolyline.getVertex(this.panoramaIndex);
        pt2 = this.selectedPolyline.getVertex(this.panoramaIndex+1);
        this.showPanorama(pt1, pt2);
    },
    hidePanorama : function (){
       $("#panorama").hide();
    },
    addPolyline : function (points){
    //    if(polyline != null){
    //        map.removeOverlay(polyline);
    //    }
        var pl = new GPolyline(points);
        this.map.addOverlay(pl);
        this.setSelectedPolylne(pl);

        this.panoramaIndex = -1;
        GEvent.addListener(pl, "lineupdated", this.showLength);
        GEvent.addListener(pl, "endline", this.endDraw);
        GEvent.addListener(pl, "cancelline", this.endDraw);
    },
    setSelectedPolylne : function (pl){
        if(this.selectedPolyline){
            this.selectedPolyline.setStrokeStyle(this.generalStyle);
        }
        this.selectedPolyline = pl;
        this.selectedPolyline.setStrokeStyle(this.selectedStyle);
        this.showLength();
    },
    handleClick : function (overlay, point){
    //    if(point == null)  return;
        /*
        if($("edit").checked){
            if(points.length == 0){
    //			points.push(marker.getLatLng());
                marker.setLatLng(point);
            }
            points.push(point);
            redrawPolyline();
        }
        else{
         */
        if(overlay instanceof GPolyline){
            walk.setSelectedPolylne(overlay)
        }
        else if(walk.isDrawing){
      //      showLength();
        }
        else{
            if(!walk.marker) walk.addMarker();
            walk.marker.setLatLng(point);
        }
    },
    handleRightClick : function (point, src, overlay){
    //    if(point == null)  return;
        /*
        if($("edit").checked){
            if(points.length == 0){
    //			points.push(marker.getLatLng());
                marker.setLatLng(point);
            }
            points.push(point);
            redrawPolyline();
        }
        else{
         */



        if(walk.selectedPolyline && overlay && overlay.index != undefined){
            walk.selectedPolyline.deleteVertex(overlay.index);
        }

        if(walk.isDrawing) walk.draw();
    },
    endDraw : function (){
        walk.isDrawing = false;

     //   GEvent.clearListeners(selectedPolyline, "lineupdated");
    //    GEvent.clearListeners(selectedPolyline, "endline");
    //    GEvent.clearListeners(selectedPolyline, "cancelline");
    },
    draw : function () {
        if(this.selectedPolyline == null){
            return;
        }
        this.isDrawing = true;
        this.selectedPolyline.enableDrawing();

    },
    recreate : function () {
        if(this.selectedPolyline == null){
            return;
        }
        var points = this.getPoints();
        this.deletePath();
        this.addPolyline(points);
    },
    newPath : function () {
        this.addPolyline([])
        this.draw();
    },
    showLength : function (){
        if(this.selectedPolyline != null){
            var len = Math.round(this.selectedPolyline.getLength());
        }
        else{
            len = 0;
        }
        $("#length").text(len);
    },
    setLatLng : function (){
        if(!this.marker) this.addMarker();
        var pt = this.marker.getLatLng();
        $("#latitude").val(pt.lat());
        $("#longitude").val(pt.lng());
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
        var frame = $("#import_frame");
        var form = $("#import_form");
        frame.load(function () {
            this.getImportPath(frame);
        });

        form.submit();
    }
}


GEvent.addDomListener(window, "unload", GUnload);

