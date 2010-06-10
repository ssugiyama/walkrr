/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */


function PathEditor(opt_options) {
    var options = opt_options || {};
    this.setValues(options);    
    this.polylines = new Array();
    this.earthRadius = 6370986;

    this.generalStyle = {strokeColor : "#0000ff", strokeOpacity: 0.5};
    this.selectedStyle = {strokeColor : "#ff0000", strokeOpacity : 0.7};
    
    if (!this.get('preEditMarkerIcon')) this.set('preEditMarkerIcon', 'http://maps.google.co.jp/mapfiles/ms/icons/blue-dot.png');
    if (!this.get('editingMarkerIcon')) this.set('editingMarkerIcon', 'http://maps.google.co.jp/mapfiles/ms/icons/red-dot.png');
    this.marker = new google.maps.Marker({draggable : true});
    
    this.set('selection', null);
    this.set('length', 0);
    this.set('prevSelection', null);
    var self = this;
    google.maps.event.addListener(this.marker, 'rightclick', function () {
        self.deletePoint();
    });
    google.maps.event.addListener(this.marker, 'click', function () {
        if(self.selection) {
            self.set('selection', null);
        }
        else {
            var pl = self.addPolyline([this.getPosition()]);
            self.set('selection', pl);
        }
    });
    google.maps.event.addListener(this.marker, 'dragstart', function (event) {
        if(self.selection) self.addPoint(event);
    });
    google.maps.event.addListener(this.marker, 'drag', function (event) {
        if(self.selection) self.movePoint(event);
    });
    google.maps.event.addListener(this.marker, 'dragend', function () {
        if(self.selection) self.set('length', self.getSelectionLength());
    });
   
    
}

PathEditor.prototype = new google.maps.MVCObject();

PathEditor.prototype.deletePath = function (){
    if(this.selection != null){
        this.selection.setMap(null);
        this.set('selection', null);
    }
    var newPolylines = [];
    for (var i = 0; i < this.polylines.length; i++) {
        var pl = this.polylines[i];
        if(pl.getMap()) newPolylines.push(pl);
    }        
    this.polylines = newPolylines;    
    
}

PathEditor.prototype.deleteAll = function () {
    this.set('selection', null);
    for (var i = 0; i < this.polylines.length; i++) {
        var pl = this.polylines[i];
        pl.setMap(null);
    }
    this.polylines = [];     
}

PathEditor.prototype.getSelectionAsString = function (){
    if(this.selection == null) return null;
    var points = [];
    this.selection.getPath().forEach(function (elem, index){
        points.push(elem.lng() + " " + elem.lat());
    });

    return points.join(",");
}

PathEditor.prototype.showPath = function (str) {
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
}

PathEditor.prototype.addPolyline = function (points){
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
        self.set('selection', pl);
    });
    return pl;

}
PathEditor.prototype.selection_changed = function (){
    var prevSelection = this.get('prevSelection');
    if (prevSelection){
        prevSelection.setOptions(this.generalStyle);
    }
    var selection = this.get('selection');
    this.set('prevSelection', selection);

    if (selection) {
        selection.setOptions(this.selectedStyle);
        var path = this.selection.getPath();

        var len = path.getLength();
        if(len > 0) {
            this.marker.setPosition(path.getAt(len-1));
        }
        this.marker.setIcon(this.editMarkerIcon);
        this.marker.setMap(this.map);
    }
    else{
        this.marker.setIcon(this.preEditMarkerIcon);
        this.marker.setMap(null);
    }
    this.set('length', this.getSelectionLength());
}

PathEditor.prototype.newPath = function () {
    var position = this.map.getCenter();
    this.set('selection', null);
    this.marker.setMap(this.map);
    this.marker.setPosition(position);
}
PathEditor.prototype.addPoint =  function (event) {
    if (! this.selection) return;
    var path = this.selection.getPath();
    path.push(event.latLng);
}
PathEditor.prototype.movePoint = function (event) {

    if (this.selection) {
        var path = this.selection.getPath();
        path.pop();
        path.push(event.latLng);
        return;
    }
 

}
PathEditor.prototype.deletePoint = function () {
    if (! this.selection) return;
    var path = this.selection.getPath();
    var len = path.getLength();
    if(len > 1) {
        path.pop();
        this.marker.setPosition(path.getAt(len-2));
    }
    this.set('length', this.getSelectionLength());
}

PathEditor.prototype.getSelectionLength = function (){
    
    var sum = 0;
    var d2r = Math.PI/180;
    if(this.selection) {
        var path = this.selection.getPath();
        var len = path.getLength();
        for (var i = 1; i < len; i++){
            var p0 = path.getAt(i-1);
            var p1 = path.getAt(i);
            var x = (p0.lng()-p1.lng())*d2r*Math.cos((p0.lat()+p1.lat())/2*d2r);
            var y = (p0.lat()-p1.lat())*d2r;
            sum += Math.sqrt(x*x + y*y)*this.earthRadius;

        }
    }
    return sum;
}


PathEditor.prototype.getElevationPoint = function (rate){

    var sum = 0;
    var d2r = Math.PI/180;
    var targetLength = this.getSelectionLength() * rate;
    if(this.selection) {
        var path = this.selection.getPath();
        var len = path.getLength();
        for (var i = 1; i < len; i++){
            var p0 = path.getAt(i-1);
            var p1 = path.getAt(i);
            var x = (p0.lng()-p1.lng())*d2r*Math.cos((p0.lat()+p1.lat())/2*d2r);
            var y = (p0.lat()-p1.lat())*d2r;
            var sum0 = sum;
            sum += Math.sqrt(x*x + y*y)*this.earthRadius;
            if (sum >= targetLength) {
                var r = (targetLength - sum0)/(sum - sum0);
                return new google.maps.LatLng(p0.lat() + (p1.lat()-p0.lat())*r, p0.lng() + (p1.lng()-p0.lng())*r);
            }
        }
    }
    return null;
}