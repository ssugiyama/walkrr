// Place your application-specific JavaScript functions and classes here
// This file is automatically included by javascript_include_tag :defaults

Element.update = function (element, html) {
    $('#' + element).html(html);
}


var Walkrr = function (){

    
    var defaultPos = new google.maps.LatLng(35.690,139.70);
    var defaultRadius = 500;
    var options = {
        zoom: 13,
        center: defaultPos,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDoubleClickZoom: true,
        scaleControl: true,
        scrollwheel : false
    };
    
    jQuery('#elevation_chart').dialog({width: 600, heght: 250, autoOpen: false, title: 'Elevation Chat'});

    var map = new google.maps.Map(document.getElementById("map"), options);
    var self = this;

    this.earthRadius = 6370986;

    this.map = map;

    this.distanceWidget = new DistanceWidget({
        color: '#000',
        activeColor: '#59b',
        sizerIcon: new google.maps.MarkerImage('./images/resize-off.png'),
        activeSizerIcon: new google.maps.MarkerImage('./images/resize.png')
    });
    this.pathEditor = new PathEditor({map: map});

    this.elevator = new google.maps.ElevationService();
    this.elevationMarker = new google.maps.Marker({icon : 'http://maps.google.co.jp/mapfiles/ms/icons/yellow.png'});

    this.chart = new google.visualization.AreaChart(document.getElementById('elevation_chart'));
    google.visualization.events.addListener(this.chart, 'onmouseover', function (e){
        var point = self.elevationPath[e.row];
        self.elevationMarker.setMap(self.map);
        self.elevationMarker.setPosition(point);
        self.map.setCenter(point);
    });
    google.visualization.events.addListener(this.chart, 'onmouseout', function (){
        self.elevationMarker.setMap(null);
    });
    google.maps.event.addListener(this.pathEditor, 'selection_changed', function () {
        if (this.selection){
            jQuery("#editing_label").show();
            if(jQuery('#elevation_chart').dialog('isOpen')){
                self.requestElevation();
            }
        }
        else {
            jQuery("#editing_label").hide();
            jQuery('#elevation_chart').dialog('close');
        }
    });
    google.maps.event.addListener(this.pathEditor, 'length_changed', function () {
        jQuery("#length").text(Math.round(this.length));
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
            self.distanceWidget.set('map', self.map);
            self.distanceWidget.set('position', self.map.getCenter());
        }
        else {
            self.distanceWidget.set('map', null);
        }
        if(jQuery("#condition_areas").attr("checked")) jQuery("#areasBox").show();
        else jQuery("#areasBox").hide();
    }).change();
    jQuery("#radius").val(String(defaultRadius));
    $("#search_form").bind("ajax:before", function () {
        self.preSearch.apply(self);
    });
    $("#create_form").bind("ajax:before", function () {
        self.preCreate.apply(self);
    });
    var frame = jQuery("#import_frame");

    frame.load(function () {
        self
        .getImportPath(frame);
    });
}

var walk;


$(document).ready(function (){
    walk = new Walkrr();
});

Walkrr.prototype = {

    preSearch : function (){
        if(jQuery("#condition_neighbor").attr("checked")){
            var pt = this.distanceWidget.get('position');
            jQuery("#latitude").val(pt.lat());
            jQuery("#longitude").val(pt.lng());
            var radius = this.distanceWidget.get('distance');
            jQuery("#radius").val(radius);
        }
        else if (jQuery("#condition_cross").attr("checked")){
            jQuery("#search_path").val(this.pathEditor.getSelectionAsString());
        }
    },
    preCreate : function () {
        jQuery('#create_path').val(this.pathEditor.getSelectionAsString());
    },
    getImportPath : function (frame){
        var pres = frame.contents().find("pre");
        var text = pres.text();
        eval(text);
    },
    importFile : function (){
        if(jQuery('#file').val()){
            var form = jQuery("#import_form");

            form.submit();
        }
        else{
            alert('Select an import file.')

        }
    },

    requestElevation : function (){
        var path = [];
        this.pathEditor.selection.getPath().forEach(function (elem,i){
           path.push(elem);
        });
        
        var pathRequest = {
            'path': path,
            'samples': 256
        }
        var self = this;
  // Initiate the path request.
        if (this.elevator) {
            this.elevator.getElevationAlongPath(pathRequest, function (results, status) {
                self.plotElevation(results, status);
            });
        }


    },

    plotElevation : function (results, status) {
        if (status == google.maps.ElevationStatus.OK) {
            var elevations = results;
            //  this.infoWindow.open(this.map);
            //  this.infoWindow.setPosition(this.map.getCenter());
            // Extract the elevation samples from the returned results
            // and store them in an array of LatLngs.
            var elevationPath = [];
            for (var i = 0; i < results.length; i++) {
                elevationPath.push(elevations[i].location);
            }
            this.elevationPath = elevationPath;

            // Extract the data from which to populate the chart.
            // Because the samples are equidistant, the 'Sample'
            // column here does double duty as distance along the
            // X axis.
            var data = new google.visualization.DataTable();
            data.addColumn('string', 'Sample');
            data.addColumn('number', 'Elevation');
            for (var i = 0; i < results.length; i++) {
                data.addRow(['', elevations[i].elevation]);
            }

            // Draw the chart using the data within its DIV.
            jQuery('#elevation_chart').dialog('open');
   
            this.chart.draw(data, {
                legend: 'none',
                titleY: 'Elevation (m)',
                pointSize : 0,
                colors : ['#ff0000']

            });
            
        }
    }
}






/**
 * A distance widget that will display a circle that can be resized and will
 * provide the radius in km.
 *
 * @param {Object} opt_options Options such as map, position etc.
 *
 * @constructor
 */
function DistanceWidget(opt_options) {
  var options = opt_options || {};

  this.setValues(options);

//  if (!this.get('position')) {
//    this.set('position', this.getMap().getCenter());
//  }

  // Add a marker to the page at the map center or specified position
  var marker = new google.maps.Marker({
    draggable: true,
    title: 'Move me!'
  });

  marker.bindTo('map', this);
  marker.bindTo('zIndex', this); 
  marker.bindTo('position', this);
  marker.bindTo('icon', this);

  // Create a new radius widget
  var radiusWidget = new RadiusWidget(options['distance'] || 500);

  // Bind the radius widget properties.
  radiusWidget.bindTo('center', this, 'position');
  radiusWidget.bindTo('map', this);
  radiusWidget.bindTo('zIndex', marker);
  radiusWidget.bindTo('maxDistance', this);
  radiusWidget.bindTo('minDistance', this);
  radiusWidget.bindTo('color', this);
  radiusWidget.bindTo('activeColor', this);
  radiusWidget.bindTo('sizerIcon', this);
  radiusWidget.bindTo('activeSizerIcon', this);

  // Bind to the radius widget distance property
  this.bindTo('distance', radiusWidget);
  // Bind to the radius widget bounds property
  this.bindTo('bounds', radiusWidget);

  var me = this;
  google.maps.event.addListener(marker, 'dblclick', function() {
    // When a user double clicks on the icon fit to the map to the bounds
    map.fitBounds(me.get('bounds'));
  });
}
DistanceWidget.prototype = new google.maps.MVCObject();


/**
 * A radius widget that add a circle to a map and centers on a marker.
 *
 * @param {number} opt_distance Optional starting distance.
 * @constructor
 */
function RadiusWidget(opt_distance) {
  var circle = new google.maps.Circle({
    strokeWeight: 2
  });

  this.set('distance', opt_distance);
  this.set('active', false);
  this.bindTo('bounds', circle);

  circle.bindTo('center', this);
  circle.bindTo('zIndex', this);
  circle.bindTo('map', this);
  circle.bindTo('strokeColor', this);
  circle.bindTo('radius', this);

  this.addSizer_();
}
RadiusWidget.prototype = new google.maps.MVCObject();


/**
 * Add the sizer marker to the map.
 *
 * @private
 */
RadiusWidget.prototype.addSizer_ = function() {
  var sizer = new google.maps.Marker({
    draggable: true,
    title: 'Drag me!'
  });

  sizer.bindTo('zIndex', this);
  sizer.bindTo('map', this);
  sizer.bindTo('icon', this);
  sizer.bindTo('position', this, 'sizer_position');

  var me = this;
  google.maps.event.addListener(sizer, 'dragstart', function() {
    me.set('active', true);
  });

  google.maps.event.addListener(sizer, 'drag', function() {
    // Set the circle distance (radius)
    me.setDistance_();
  });

  google.maps.event.addListener(sizer, 'dragend', function() {
    me.set('active', false);
  });
};


/**
 * Update the radius when the distance has changed.
 */
RadiusWidget.prototype.distance_changed = function() {
  this.set('radius', this.get('distance'));
};

/**
 * Update the radius when the min distance has changed.
 */
RadiusWidget.prototype.minDistance_changed = function() {
  if (this.get('minDistance') &&
      this.get('distance') < this.get('minDistance')) {
    this.setDistance_();
  }
};


/**
 * Update the radius when the max distance has changed.
 */
RadiusWidget.prototype.maxDistance_changed = function() {
  if (this.get('maxDistance') &&
      this.get('distance') > this.get('maxDistance')) {
    this.setDistance_();
  }
};


/**
 * Update the stroke color when the color is changed.
 */
RadiusWidget.prototype.color_changed = function() {
  this.active_changed();
};


/**
 * Update the active stroke color when the color is changed.
 */
RadiusWidget.prototype.activeColor_changed = function() {
  this.active_changed();
};


/**
 * Update the active stroke color when the color is changed.
 */
RadiusWidget.prototype.sizerIcon_changed = function() {
  this.active_changed();
};


/**
 * Update the active stroke color when the color is changed.
 */
RadiusWidget.prototype.activeSizerIcon_changed = function() {
  this.active_changed();
};


/**
 * Update the center of the circle and position the sizer back on the line.
 *
 * Position is bound to the DistanceWidget so this is expected to change when
 * the position of the distance widget is changed.
 */
RadiusWidget.prototype.center_changed = function() {
  var sizerPos = this.get('sizer_position');
  var position;
  if (sizerPos) {
    position = this.getSnappedPosition_(sizerPos);
  } else {
    var bounds = this.get('bounds');
    if (bounds) {
      var lng = bounds.getNorthEast().lng();
      position = new google.maps.LatLng(this.get('center').lat(), lng);
    }
  }

  if (position) {
    this.set('sizer_position', position);
  }
};

/**
 * Update the center of the circle and position the sizer back on the line.
 */
RadiusWidget.prototype.active_changed = function() {
  var strokeColor;
  var icon;

  if (this.get('active')) {
    if (this.get('activeColor')) {
      strokeColor = this.get('activeColor');
    }

    if (this.get('activeSizerIcon')) {
      icon = this.get('activeSizerIcon');
    }
  } else {
    strokeColor = this.get('color');

    icon = this.get('sizerIcon');
  }

  if (strokeColor) {
    this.set('strokeColor', strokeColor);
  }

  if (icon) {
    this.set('icon', icon);
  }
};


/**
 * Set the distance of the circle based on the position of the sizer.
 * @private
 */
RadiusWidget.prototype.setDistance_ = function() {
  // As the sizer is being dragged, its position changes.  Because the
  // RadiusWidget's sizer_position is bound to the sizer's position, it will
  // change as well.
  var pos = this.get('sizer_position');
  var center = this.get('center');
  var distance = this.distanceBetweenPoints_(center, pos);

  if (this.get('maxDistance') && distance > this.get('maxDistance')) {
    distance = this.get('maxDistance');
  }

  if (this.get('minDistance') && distance < this.get('minDistance')) {
    distance = this.get('minDistance');
  }

  // Set the distance property for any objects that are bound to it
  this.set('distance', distance);

  var newPos = this.getSnappedPosition_(pos);
  this.set('sizer_position', newPos);
};


/**
 * Finds the closest left or right of the circle to the position.
 *
 * @param {google.maps.LatLng} pos The position to check against.
 * @return {google.maps.LatLng} The closest point to the circle.
 * @private.
 */
RadiusWidget.prototype.getSnappedPosition_ = function(pos) {
  var bounds = this.get('bounds');
  var center = this.get('center');
  var left = new google.maps.LatLng(center.lat(),
      bounds.getSouthWest().lng());
  var right = new google.maps.LatLng(center.lat(),
      bounds.getNorthEast().lng());

  var leftDist = this.distanceBetweenPoints_(pos, left);
  var rightDist = this.distanceBetweenPoints_(pos, right);

  if (leftDist < rightDist) {
    return left;
  } else {
    return right;
  }
};


/**
 * Calculates the distance between two latlng points in km.
 * @see http://www.movable-type.co.uk/scripts/latlong.html
 *
 * @param {google.maps.LatLng} p1 The first lat lng point.
 * @param {google.maps.LatLng} p2 The second lat lng point.
 * @return {number} The distance between the two points in km.
 * @private
 */
RadiusWidget.prototype.distanceBetweenPoints_ = function(p1, p2) {
  if (!p1 || !p2) {
    return 0;
  }

  var R = 6370986; // Radius of the Earth in km
  var d2r = Math.PI/180;
  var x = (p1.lng()-p2.lng())*d2r*Math.cos((p1.lat()+p2.lat())/2*d2r);
  var y = (p1.lat()-p2.lat())*d2r;
  return Math.sqrt(x*x + y*y)*R;
};




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

PathEditor.prototype.showPath = function (str, select) {
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
    var pl = this.addPolyline(points);
    if (needsPan) this.map.panTo(points[0]);
    if(select) this.set('selection', pl);
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


jQuery(function ($) {
    var csrf_token = $('meta[name=csrf-token]').attr('content'),
        csrf_param = $('meta[name=csrf-param]').attr('content');

    $.fn.extend({
        /**
         * Triggers a custom event on an element and returns the event result
         * this is used to get around not being able to ensure callbacks are placed
         * at the end of the chain.
         *
         * TODO: deprecate with jQuery 1.4.2 release, in favor of subscribing to our
         *       own events and placing ourselves at the end of the chain.
         */
        triggerAndReturn: function (name, data) {
            var event = new $.Event(name);
            this.trigger(event, data);

            return event.result !== false;
        },

        /**
         * Handles execution of remote calls firing overridable events along the way
         */
        callRemote: function () {
            var el      = this,
                method  = el.attr('method') || el.attr('data-method') || 'GET',
                url     = el.attr('action') || el.attr('href'),
                dataType  = el.attr('data-type')  || 'script';

            if (url === undefined) {
              throw "No URL specified for remote call (action or href must be present).";
            } else {
                if (el.triggerAndReturn('ajax:before')) {
                    var data = el.is('form') ? el.serializeArray() : [];
                    $.ajax({
                        url: url,
                        data: data,
                        dataType: dataType,
                        type: method.toUpperCase(),
                        beforeSend: function (xhr) {
                            el.trigger('ajax:loading', xhr);
                        },
                        success: function (data, status, xhr) {
                            el.trigger('ajax:success', [data, status, xhr]);
                        },
                        complete: function (xhr) {
                            el.trigger('ajax:complete', xhr);
                        },
                        error: function (xhr, status, error) {
                            el.trigger('ajax:failure', [xhr, status, error]);
                        }
                    });
                }

                el.trigger('ajax:after');
            }
        }
    });

    /**
     *  confirmation handler
     */
    $('a[data-confirm],input[data-confirm]').live('click', function () {
        var el = $(this);
        if (el.triggerAndReturn('confirm')) {
            if (!confirm(el.attr('data-confirm'))) {
                return false;
            }
        }
    });


    /**
     * remote handlers
     */
    $('form[data-remote]').live('submit', function (e) {
        $(this).callRemote();
        e.preventDefault();
    });

    $('a[data-remote],input[data-remote]').live('click', function (e) {
        $(this).callRemote();
        e.preventDefault();
    });

    $('a[data-method]:not([data-remote])').live('click', function (e){
        var link = $(this),
            href = link.attr('href'),
            method = link.attr('data-method'),
            form = $('<form method="post" action="'+href+'"></form>'),
            metadata_input = '<input name="_method" value="'+method+'" type="hidden" />';

        if (csrf_param != null && csrf_token != null) {
          metadata_input += '<input name="'+csrf_param+'" value="'+csrf_token+'" type="hidden" />';
        }

        form.hide()
            .append(metadata_input)
            .appendTo('body');

        e.preventDefault();
        form.submit();
    });

    /**
     * disable-with handlers
     */
    var disable_with_input_selector           = 'input[data-disable-with]';
    var disable_with_form_remote_selector     = 'form[data-remote]:has('       + disable_with_input_selector + ')';
    var disable_with_form_not_remote_selector = 'form:not([data-remote]):has(' + disable_with_input_selector + ')';

    var disable_with_input_function = function () {
        $(this).find(disable_with_input_selector).each(function () {
            var input = $(this);
            input.data('enable-with', input.val())
                .attr('value', input.attr('data-disable-with'))
                .attr('disabled', 'disabled');
        });
    };

    $(disable_with_form_remote_selector).live('ajax:before', disable_with_input_function);
    $(disable_with_form_not_remote_selector).live('submit', disable_with_input_function);

    $(disable_with_form_remote_selector).live('ajax:complete', function () {
        $(this).find(disable_with_input_selector).each(function () {
            var input = $(this);
            input.removeAttr('disabled')
                 .val(input.data('enable-with'));
        });
    });

});