/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */


function PathEditor(opt_options) {
    var options = opt_options || {};
    this.setValues(options);    
    this.polylines = new Array();
    this.earthRadius = 6370986;

    this.generalStyle = {strokeColor : "#0000ff", strokeOpacity: 0.5, zIndex: 10};
    this.selectedStyle = {strokeColor : "#ff0000", strokeOpacity : 0.7, zIndex: 10};

    this.drawingManager = new google.maps.drawing.DrawingManager({
	drawingMode: google.maps.drawing.OverlayType.POLYLINE,
	drawingControl: true,
	drawingControlOptions: {
	    position: google.maps.ControlPosition.TOP_CENTER,
	    drawingModes: [google.maps.drawing.OverlayType.POLYLINE]
	},
	polylineOptions: this.selectedStyle
    });
    this.drawingManager.setDrawingMode(null);
    this.drawingManager.setMap(this.map);
    
   
//    this.set('selection', null);
    this.set('length', 0);
    this.set('prevSelection', null);
    var self = this;
    
    google.maps.event.addListener(this.drawingManager, 'polylinecomplete', function(polyline) {
	self.addPolyline(polyline);
	self.set('selection', polyline);
	self.drawingManager.setDrawingMode(null);
    });
   
    
}

PathEditor.prototype = new google.maps.MVCObject();

PathEditor.prototype.toggleEditable = function (){
    if(this.selection != null){
	var editable  = this.selection.getEditable();
        this.selection.setEditable(!editable);
    }
};

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


PathEditor.prototype.showPath = function (str, select) {
//    clearPath();
//    var pl = Walkrr.wkt2GMap(str);
    var pl = new google.maps.Polyline({});
    pl.setPath(google.maps.geometry.encoding.decodePath(str));

    this.addPolyline(pl);
    if(select && pl.getPath().getLength() > 0) {
        this.set('selection', pl);
        var xmin, xmax, ymin, ymax;
        pl.getPath().forEach(function (elem, i){
           if (i == 0) {
               xmin = xmax = elem.lng();
               ymin = ymax = elem.lat();
           }
           else {
               if (xmin > elem.lng()) xmin = elem.lng();
               if (xmax < elem.lng()) xmax = elem.lng();
               if (ymin > elem.lat()) ymin = elem.lat();
               if (ymax < elem.lat()) ymax = elem.lat();
           }
        });
        var center = new google.maps.LatLng((ymin+ymax)/2, (xmin+xmax)/2);
        this.map.panTo(center);
    }
}

PathEditor.prototype.addPolyline = function (pl){

    pl.setOptions(this.generalStyle);
    pl.setMap(this.map);
    this.polylines.push(pl);
    var self = this;

    google.maps.event.addListener(pl, 'click', function () {
        self.set('selection', pl);
    });
    var deleteNode = function(mev) {
	if (mev.vertex != null) {
	    pl.getPath().removeAt(mev.vertex);
	}
    }
    google.maps.event.addListener(pl, 'rightclick', deleteNode);
}
PathEditor.prototype.selection_changed = function (){
    var prevSelection = this.get('prevSelection');
    if (prevSelection){
        prevSelection.setOptions(this.generalStyle);
	prevSelection.setEditable(false);
    }
    var selection = this.get('selection');
    this.set('prevSelection', selection);

    if (selection) {
        selection.setOptions(this.selectedStyle);
        var path = this.selection.getPath();

        var len = path.getLength();
    }

    this.clearLocalStorage();
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

PathEditor.prototype.storeInLocalStorage = function (){
    if (localStorage && this.selection) {
	console.log('store');
	localStorage['editingPath'] = google.maps.geometry.encoding.encodePath(this.selection.getPath());
    }
}

PathEditor.prototype.clearLocalStorage = function (){
    if (localStorage) {
	console.log('delete');
        delete localStorage['editingPath'];
    }
}

PathEditor.prototype.loadFromLocalStorage = function (){
    if(! localStorage || !localStorage['editingPath']) return false;
    console.log('load');
    this.showPath(localStorage['editingPath'], true);
    return true;
}
