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




