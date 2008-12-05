// Place your application-specific JavaScript functions and classes here
// This file is automatically included by javascript_include_tag :defaults
var map;
var polyline;
var handler;
var marker;
var isDrawing = false;
var streetView;
var client;
function onLoad(){
    //    google.load("maps", "2", {"locale" : "ja_JP"});
    map = new GMap2(document.getElementById("map"));
    map.addMapType(G_PHYSICAL_MAP);
    map.removeMapType(G_HYBRID_MAP);
    map.enableGoogleBar();
//    map.enableScrollWheelZoom();
    map.addControl(new GLargeMapControl());
    map.addControl(new GMenuMapTypeControl());
    streetView = new GStreetviewPanorama(document.getElementById("panorama"));
    client = new GStreetviewClient();
    var pt = new GLatLng(35.690,139.700);
    map.setCenter(pt, 13);
    marker = new GMarker(pt);
    map.addOverlay(marker);
    handler = GEvent.addListener(map, "click", handleClick);
    points = new Array();
    Event.addBehavior.reassignAfterAjax = true;
    Event.addBehavior({
        'div.pagination a' : Remote.Link
    });
}

function clearPath() {

    if(polyline != null){
        map.removeOverlay(polyline);
        polyline = null;
    }
    isDrawing = false;
}

function setPath(id){
    if(polyline == null) return;
    var points = [];
    var count = polyline.getVertexCount();
    for (var i = 0; i < count; i++){
        var vertex = polyline.getVertex(i);
        points.push(vertex.lng() + " " + vertex.lat())
    }

    $(id).value = points.join(",");
}

var panoramaIndex;
function showPath(str) {
    clearPath();
    var pts = str.split(",");
    var points = [];
    for(var i = 0; i < pts.length; i++){
        var pt = pts[i];
        var ps = pt.split(" ");
        if(ps.length < 2) continue;
        points.push(new GLatLng(ps[1], ps[0]));
    }
    redrawPolyline(points);
    map.panTo(polyline.getBounds().getCenter());
}

function getYaw(pt1, pt2){
    var ret = Math.atan2((pt2.lng() - pt1.lng())*Math.cos(pt1.latRadians()), pt2.lat() - pt1.lat())*180/Math.PI;
//    alert("(" + pt1.lng().toString() + "," + pt1.lat().toString()+ ")-(" + pt2.lng().toString() + ","+ pt2.lat().toString() + ")=" + ret);
    return ret;
}

function showPanorama(pt1, pt2) {
    $("panorama").style.display = "block";

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
    if(!polyline) return;
    
    var count = polyline.getVertexCount();
    if(panoramaIndex+1 >= count) return;
    panoramaIndex++;
    pt1 = polyline.getVertex(panoramaIndex);
    pt2 = (panoramaIndex+1 < count)?polyline.getVertex(panoramaIndex+1):null;
    showPanorama(pt1, pt2);
}

function prevPanorama(){
    var pt1, pt2;
    if(!polyline) return;
    
    if(panoramaIndex <= 0) return;
    panoramaIndex--;
    pt1 = polyline.getVertex(panoramaIndex);
    pt2 = polyline.getVertex(panoramaIndex+1);
    showPanorama(pt1, pt2);
}

function hidePanorama(){
    $("panorama").style.display = "none";
}
function redrawPolyline(points){
    if(polyline != null){
        map.removeOverlay(polyline);
    }
    polyline = new GPolyline(points);
    map.addOverlay(polyline);
    showLength();
    panoramaIndex = -1;
}

function handleClick(overlay, point){
    if(point == null)  return;
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
    if(isDrawing){
        showLength();
    }
    else{
        marker.setLatLng(point);
    }
}

function endDraw(){
    isDrawing = false;
    showLength();
    GEvent.clearListeners(polyline, "endline");
    GEvent.clearListeners(polyline, "cancelline");
}
function draw() {
    if(polyline == null){
        polyline = new GPolyline(points);
        map.addOverlay(polyline);
        panoramaIndex = -1;
    }
    isDrawing = true;
    polyline.enableDrawing();
    GEvent.addListener(polyline, "endline", endDraw);
    GEvent.addListener(polyline, "cancelline", endDraw);
}


function back(){
    if(polyline == null) return;
    var count = polyline.getVertexCount();
    if(count > 0){
	polyline.deleteVertex(count-1);
    }
    showLength();
    if(isDrawing) draw();
}

function showLength(){
    if(polyline != null){
        var len = Math.round(polyline.getLength());
    }
    else{
        len = 0;
    }
    $("length").innerHTML = len;
}

function setLatLng(){
    var pt = marker.getLatLng();
    $("latitude").value = pt.lat();
    $("longitude").value = pt.lng();
}

function length(){
    if(polyline == null){
        return 0;
    }
    else{
        return Math.round(polyline.getLength());
    }
}

function getImportPath(frame){
    var doc = frame.contentWindow.document;
    var pres = doc.getElementsByTagName("pre");
    var text = pres[0].innerHTML;
    showPath(text)
}
function importFile(){
    var frame = $("import_frame");
    var form = $("import_form");
    if(document.all){
        frame.onreadystatechange = function () {
            if (this.readyState == "complete") {
                getImportPath(frame);
                this.onreadystatechange = null;
            }
        }
    }
    else {
        frame.onload = function () {
            getImportPath(frame);
        }
    }		
    form.submit();
}

GEvent.addDomListener(window, "load", onLoad);
GEvent.addDomListener(window, "unload", GUnload);

