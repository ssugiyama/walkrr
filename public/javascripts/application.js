// Place your application-specific JavaScript functions and classes here
// This file is automatically included by javascript_include_tag :defaults

Element.update = function (element, html) {
    $('#' + element).html(html);
}


var Walkrr = function (){

    this.areaStyle = {fillColor : "#00ff00", fillOpacity: 0.1, strokeColor: "#00ff00", strokeOPacity: 0.5,  zIndex: 0};
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
    
    $('#elevation_chart').dialog({width: 600, heght: 250, autoOpen: false, title: 'Elevation Chat'});

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
            $("#editing_label").show();
            if($('#elevation_chart').dialog('isOpen')){
                self.requestElevation();
            }
        }
        else {
            $("#editing_label").hide();
            $('#elevation_chart').dialog('close');
        }
    });
    google.maps.event.addListener(this.pathEditor, 'length_changed', function () {
        $("#length").text(Math.round(this.length));
    });
    $("#editing_label").hide();
    $(".pagination a").live('click', function() {
      var el = $(this);

      $.get(el.attr('href'), null, null, 'script');
      return false;

    });
    $("#date").datepicker({dateFormat: 'yy-mm-dd'});
    $("#tabs").tabs();
    $("#conditionBox input").change(function (){

        if($("#condition_neighbor").attr("checked")){
            self.distanceWidget.set('map', self.map);
            self.distanceWidget.set('position', self.map.getCenter());
        }
        else {
            self.distanceWidget.set('map', null);
        }
        if($("#condition_areas").attr("checked")) {
//            $("#areasBox").show();
            self.areas = [];
            google.maps.event.addListener(self.map, 'click', function (event) {
                $.ajax({
                    url: '/add_area',
                    data: "latitude=" + event.latLng.lat() + "&longitude=" + event.latLng.lng()
                });
            });
        }
        else{
            for (var id in self.areas) {
                var pg = self.areas[id];
                pg.setMap(null);
            }
            self.areas = null;
//          $("#areasBox").hide();
            google.maps.event.clearListeners(self.map, 'click');
        }
    }).change();
    $("#radius").val(String(defaultRadius));
    $("#search_form").bind("ajax:before", function () {
        self.preSearch.apply(self);
    });
    $("#create_form").bind("ajax:before", function () {
        self.preCreate.apply(self);
    });


    var frame = $("#import_frame");

    frame.load(function () {
        self
        .getImportPath(frame);
    });
}

Walkrr.wkt2GMap = function (wkt) {
    var parsePointsString = function (str) {
        var ps = str.split(/,/);
        return ps.map(function (element, index, array) {
            var ns = element.split(/ /);
            return new google.maps.LatLng(ns[1], ns[0]);
        });
    };
 
    if (!wkt.match(/^(\w+)\((.+)\)$/)) return null;
    var name = RegExp.$1;
    var contents = RegExp.$2;
    if (name == 'LINESTRING') {
        var points = parsePointsString(contents);
        var polyline = new google.maps.Polyline({});
        polyline.setPath(points);
        return polyline;
    }
    else if (name == 'MULTIPOLYGON') {
        var items = contents.match(/\(\([\d, .]+\)\)/g);
      
        var paths = items.map(function (element, index, array){
            return parsePointsString(element.substr(2, element.length-4));
        });
        var polygon =  new google.maps.Polygon({});
        polygon.setPaths(paths);
        return polygon;
    }

    return null;
};
Walkrr.polyline2wkt = function (pl) {
    if (!pl) return null;
    var points = [];
    pl.getPath().forEach(function (elem, index){
        points.push(elem.lng() + " " + elem.lat());
    });

    return "SRID=4326;LINESTRING(" + points.join(",") + ")";

};


var walk;


$(document).ready(function (){
    walk = new Walkrr();
});

Walkrr.prototype = {

    preSearch : function (){
        if($("#condition_neighbor").attr("checked")){
            var pt = this.distanceWidget.get('position');
            $("#latitude").val(pt.lat());
            $("#longitude").val(pt.lng());
            var radius = this.distanceWidget.get('distance');
            $("#radius").val(radius);
        }
        else if ($("#condition_cross").attr("checked")){
            $("#search_path").val(this.pathEditor.getSelectionAsString());
        }
        else if ($("#condition_areas").attr("checked")){
            var ids = [];
            for (var id in this.areas) {
                ids.push(id);
            }
            $("#areas").val(ids.join(","));
        }
    },
    preCreate : function () {
        $('#create_path').val(Walkrr.polyline2wkt(this.pathEditor.selection));
    },
    getImportPath : function (frame){
        var pres = frame.contents().find("pre");
        var text = pres.text();
        eval(text);
    },
    importFile : function (){
        if($('#file').val()){
            var form = $("#import_form");

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
            $('#elevation_chart').dialog('open');
   
            this.chart.draw(data, {
                legend: 'none',
                titleY: 'Elevation (m)',
                pointSize : 0,
                colors : ['#ff0000']

            });
            
        }
    },
    addArea : function (id, str) {
        var pg = Walkrr.wkt2GMap(str);
        pg.setOptions(this.areaStyle);
        pg.setMap(this.map);
        this.areas[id] = pg;
        var self = this;
        google.maps.event.addListener(pg, 'click',  function () {
            pg.setMap(null);
            pg = null;
            delete self.areas[id];
        });
    }
}




