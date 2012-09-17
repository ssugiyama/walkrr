/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
(function (global) {
    "use strict";

    function PathManager(opt_options) {
	var options = opt_options || {};
	this.setValues(options);    
	this.polylines = new Array();

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
	    console.log('polylinecomp');
	    if (self.selection && confirm('Will you append the path?')) {
		polyline.getPath().forEach(function (elm) {
		    self.selection.getPath().push(elm);
		});
		polyline.setMap(null);
		self.updateLength();
	    }
	    else {
		self.addPolyline(polyline);
		self.set('selection', polyline);
	    }
	    self.storeInLocalStorage();
	    
	    self.drawingManager.setDrawingMode(null);
	});
    }

    PathManager.prototype = new google.maps.MVCObject();

    PathManager.prototype.deletePath = function (){
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

    PathManager.prototype.deleteAll = function () {
	this.set('selection', null);
	for (var i = 0; i < this.polylines.length; i++) {
            var pl = this.polylines[i];
            pl.setMap(null);
	}
	this.polylines = [];     
    }


    PathManager.prototype.showPath = function (path, select) {
	//    clearPath();
	//    var pl = Walkrr.wkt2GMap(str);
	var pl = new google.maps.Polyline({});
	if (typeof(path) == 'string') {
	    path = google.maps.geometry.encoding.decodePath(path);
	}
	pl.setPath(path);

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

    PathManager.prototype.addPolyline = function (pl){

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
	function path_callback () {
	    self.storeInLocalStorage();
	    self.updateLength();
	}
	google.maps.event.addListener(pl.getPath(), 'insert_at', path_callback);
	google.maps.event.addListener(pl.getPath(), 'remove_at', path_callback);
	google.maps.event.addListener(pl.getPath(), 'set_at', path_callback);
    }
    PathManager.prototype.selection_changed = function (){
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
	    this.storeInLocalStorage();
	}
	this.updateLength();
	this.unbind('editable');
	if (selection) this.bindTo('editable', selection);
    }

    PathManager.prototype.getEncodedSelection = function () {
	if (this.selection) {
	    return google.maps.geometry.encoding.encodePath(this.selection.getPath());
	}
	else {
	    return null;
	}
    }
    PathManager.prototype.storeInLocalStorage = function (){
	if (localStorage && this.selection) {
	    console.log('store');
	    localStorage['editingPath'] = this.getEncodedSelection();
	}
    }

    PathManager.prototype.clearLocalStorage = function (){
	if (localStorage) {
	    console.log('delete');
            delete localStorage['editingPath'];
	}
    }

    PathManager.prototype.loadFromLocalStorage = function (){
	if(! localStorage || !localStorage['editingPath']) return false;
	console.log('load');
	this.showPath(localStorage['editingPath'], true);
	return true;
    }
    PathManager.prototype.updateLength = function (){   
	if (this.selection)
	    this.set('length', google.maps.geometry.spherical.computeLength(this.selection.getPath())/1000);
	else 
	    this.set('length', "");
    }
    global.PathManager = PathManager;
})(this);
