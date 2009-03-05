// Place your application-specific JavaScript functions and classes here
// This file is automatically included by javascript_include_tag :defaults
var map;
var selectedPolyline;
var handler;
var marker;
var isDrawing = false;
var streetView;
var client;

var generalStyle = { color : "#0000ff"};
var selectedStyle = { color : "#ff0000", opacity : 0.5};
$(document).ready(function (){
    //    google.load("maps", "2", {"locale" : "ja_JP"});
    map = new GMap2(document.getElementById("map"));
    map.addMapType(G_PHYSICAL_MAP);
    map.removeMapType(G_HYBRID_MAP);
    map.enableGoogleBar();
    map.disableDoubleClickZoom();
//    map.enableScrollWheelZoom();
    map.addControl(new GLargeMapControl());
    map.addControl(new GMenuMapTypeControl());
    streetView = new GStreetviewPanorama(document.getElementById("panorama"));
    client = new GStreetviewClient();
    var pt = new GLatLng(35.690,139.700);
    map.setCenter(pt, 13);
    addMarker();
    GEvent.addListener(map, "click", handleClick);
    GEvent.addListener(map, "singlerightclick", handleRightClick);

    points = new Array();
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

 
});

function addMarker (){
    marker = new GMarker(map.getCenter());
    map.addOverlay(marker);
}

function deletePath() {

    if(selectedPolyline != null){
        map.removeOverlay(selectedPolyline);
        selectedPolyline = null;
    }
    isDrawing = false;
}

function deleteAll() {
    map.clearOverlays();
    selectedPolyline = null;
    marker = null;
    isDrawing = false;
    
}

function getPoints() {
    if(selectedPolyline == null) return [];
    var points = [];
    var count = selectedPolyline.getVertexCount();
    for (var i = 0; i < count; i++){
        var vertex = selectedPolyline.getVertex(i);
        points.push(vertex)
    }    
    return points;
}

function retrievePointsFromPath(id){
    if(selectedPolyline == null) return;
    var points = [];
    var count = selectedPolyline.getVertexCount();
    for (var i = 0; i < count; i++){
        var vertex = selectedPolyline.getVertex(i);
        points.push(vertex.lng() + " " + vertex.lat())
    }

    $(id).val(points.join(","));
}

var panoramaIndex;
function showPath(str) {
//    clearPath();
    var pts = str.split(",");
    var points = [];
    for(var i = 0; i < pts.length; i++){
        var pt = pts[i];
        var ps = pt.split(" ");
        if(ps.length < 2) continue;
        points.push(new GLatLng(ps[1], ps[0]));
    }
    addPolyline(points);
    map.panTo(selectedPolyline.getBounds().getCenter());
}

function getYaw(pt1, pt2){
    var ret = Math.atan2((pt2.lng() - pt1.lng())*Math.cos(pt1.latRadians()), pt2.lat() - pt1.lat())*180/Math.PI;
//    alert("(" + pt1.lng().toString() + "," + pt1.lat().toString()+ ")-(" + pt2.lng().toString() + ","+ pt2.lat().toString() + ")=" + ret);
    return ret;
}

function showPanorama(pt1, pt2) {
    $("#panorama").show();

    var yaw, pov;
    if(pt2){
        yaw = getYaw(pt1, pt2);
    }
    pov = yaw?{yaw : yaw}:null;
    client.getNearestPanoramaLatLng(pt1, function (pt){
        streetView.setLocationAndPOV(pt, pov);
        marker.setLatLng(pt);
        map.panTo(pt);
    });    
    
}
function nearestPanorama(){
    var pt = marker.getLatLng();
    showPanorama(pt);
}
function nextPanorama(){
    var pt1, pt2;
    if(!selectedPolyline) return;
    
    var count = selectedPolyline.getVertexCount();
    if(panoramaIndex+1 >= count) return;
    panoramaIndex++;
    pt1 = selectedPolyline.getVertex(panoramaIndex);
    pt2 = (panoramaIndex+1 < count)?selectedPolyline.getVertex(panoramaIndex+1):null;
    showPanorama(pt1, pt2);
}

function prevPanorama(){
    var pt1, pt2;
    if(!selectedPolyline) return;
    
    if(panoramaIndex <= 0) return;
    panoramaIndex--;
    pt1 = selectedPolyline.getVertex(panoramaIndex);
    pt2 = selectedPolyline.getVertex(panoramaIndex+1);
    showPanorama(pt1, pt2);
}

function hidePanorama(){
    $("#panorama").hide();
}
function addPolyline(points){
//    if(polyline != null){
//        map.removeOverlay(polyline);
//    }
    var pl = new GPolyline(points);
    map.addOverlay(pl);
    setSelectedPolylne(pl);
    
    panoramaIndex = -1;
    GEvent.addListener(pl, "lineupdated", showLength);
    GEvent.addListener(pl, "endline", endDraw);
    GEvent.addListener(pl, "cancelline", endDraw);
}

function setSelectedPolylne(pl){
    if(selectedPolyline){
        selectedPolyline.setStrokeStyle(generalStyle);
    }
    selectedPolyline = pl;
    selectedPolyline.setStrokeStyle(selectedStyle);
    showLength();
}


function handleClick(overlay, point){
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
        setSelectedPolylne(overlay)
    }
    else if(isDrawing){
  //      showLength();
    }
    else{
        if(!marker) addMarker();
        marker.setLatLng(point);
    }
}
function handleRightClick(point, src, overlay){
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
  
    

    if(selectedPolyline && overlay && overlay.index != undefined){
        selectedPolyline.deleteVertex(overlay.index);
    }

    if(isDrawing) draw();
}
function endDraw(){
    isDrawing = false;
 
 //   GEvent.clearListeners(selectedPolyline, "lineupdated");
//    GEvent.clearListeners(selectedPolyline, "endline");
//    GEvent.clearListeners(selectedPolyline, "cancelline");
}
function draw() {
    if(selectedPolyline == null){
        return;
    }
    isDrawing = true;
    selectedPolyline.enableDrawing();

}

function recreate() {
    if(selectedPolyline == null){
        return;
    }
    var points = getPoints();
    deletePath();
    addPolyline(points);
}

function newPath() {
    addPolyline([])
    draw();
}



function showLength(){
    if(selectedPolyline != null){
        var len = Math.round(selectedPolyline.getLength());
    }
    else{
        len = 0;
    }
    $("#length").text(len);
}

function setLatLng(){
    if(!marker) addMarker();
    var pt = marker.getLatLng();
    $("#latitude").val(pt.lat());
    $("#longitude").val(pt.lng());
}

function length(){
    if(selectedPolyline == null){
        return 0;
    }
    else{
        return Math.round(selectedPolyline.getLength());
    }
}

function getImportPath(frame){
    var pres = frame.contents().find("pre");
    var text = pres.text();
    eval(text);
}
function importFile(){
    var frame = $("#import_frame");
    var form = $("#import_form");
    frame.load(function () {
        getImportPath(frame);
    });
	
    form.submit();
}

GEvent.addDomListener(window, "unload", GUnload);

