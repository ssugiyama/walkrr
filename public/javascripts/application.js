// Place your application-specific JavaScript functions and classes here
// This file is automatically included by javascript_include_tag :defaults

Element.update = function (element, html) {
    $('#' + element).html(html);
}


var Walkrr = function (){
    var self = this;
    this.areaStyle = {fillColor : "#00ff00", fillOpacity: 0.1, strokeColor: "#00ff00", strokeOPacity: 0.5,  zIndex: 0};
    var defaultPos = new google.maps.LatLng(35.690,139.70);
    this.defaultRadius = 500;
    var options = {
        zoom: 13,
        center: defaultPos,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDoubleClickZoom: true,
        scaleControl: true,
        scrollwheel : false,
        streetViewControl: true
    };
    
    $('#elevation_chart').dialog({width: 600, heght: 250, autoOpen: false, title: 'Elevation Chat'});
    $('#panorama_box').dialog({
        width: 480, height : 340, autoOpen: false, title: 'Street View',
        close: function (event, ui) {
            self.panorama.setVisible(false);
        }

    });
    var map = new google.maps.Map(document.getElementById("map"), options);
   

    this.earthRadius = 6370986;
    this.areas = [];
    this.map = map;
    this.panorama = new google.maps.StreetViewPanorama(document.getElementById("panorama"), {});
    this.streetViewService = new google.maps.StreetViewService();
    this.map.setStreetView(this.panorama);
    this.panorama.setVisible(true);
    this.panoramaIndex = 0;
    this.panoramaInterval = 100;
    this.distanceWidget = new DistanceWidget({
        color: '#000',
        activeColor: '#59b',
        sizerIcon: new google.maps.MarkerImage('./images/resize-off.png'),
        activeSizerIcon: new google.maps.MarkerImage('./images/resize.png'),
        position: defaultPos
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
        self.panoramaPointsAndHeadings = self.getPanoramaPointsAndHeadings();
        if (this.selection){
            $("#editing_label").show();
            if($('#elevation_chart').dialog('isOpen')){
                self.requestElevation();
            }
            self.panoramaIndex = 0;
            if($('#panorama_box').dialog('isOpen')){            
                self.showPanorama();
            }
        }
        else {
            $("#editing_label").hide();
            $('#elevation_chart').dialog('close');
            $('#panorama_box').dialog('close');
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
    google.maps.event.addListener(this.map, 'click', function (event) {
        if($("#condition_neighbor").attr("checked")){
            self.distanceWidget.set('position', event.latLng);
        }
        else if($("#condition_areas").attr("checked")) {
            $.ajax({
                url: addAreaUrl,
                data: "latitude=" + event.latLng.lat() + "&longitude=" + event.latLng.lng()
            });
        }


    });
    $("#conditionBox input").change(function (){
       
        if($("#condition_neighbor").attr("checked")){
            self.distanceWidget.set('map', self.map);
        }
        else {
            self.distanceWidget.set('map', null);
        }
        var showAreas = $("#condition_areas").attr("checked");
        for (var id in self.areas) {
            var pg = self.areas[id];
            pg.setMap(showAreas?self.map:null);
        }


    }).change();
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
    resetSearch : function (){
        $("#search_form").each(function (){
           this.reset();
        });
        $("#conditionBox input").change();
        this.areas = [];
        this.distanceWidget.set('distance', this.defaultRadius);
        this.distanceWidget.set('position', this.map.getCenter());
   
    },
    preSearch : function (){
        if($("#condition_neighbor").attr("checked")){
            var pt = this.distanceWidget.get('position');
            $("#latitude").val(pt.lat());
            $("#longitude").val(pt.lng());
            var radius = this.distanceWidget.get('distance');
            $("#radius").val(radius);
        }
        else if ($("#condition_cross").attr("checked")){
            $("#search_path").val(Walkrr.polyline2wkt(this.pathEditor.selection));
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
        if (this.areas[id]) return;
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
    },
    getHeading : function (pt1, pt2){
        var ret = Math.atan2((pt2.lng() - pt1.lng())*Math.cos(pt1.lat()*Math.PI/180), pt2.lat() - pt1.lat())*180/Math.PI;
//    alert("(" + pt1.lng().toString() + "," + pt1.lat().toString()+ ")-(" + pt2.lng().toString() + ","+ pt2.lat().toString() + ")=" + ret);
        return ret;
    },
    getDistance:  function(p1, p2) {
        if (!p1 || !p2) {
        return 0;
        }

       // Radius of the Earth in km
        var d2r = Math.PI/180;
        var x = (p1.lng()-p2.lng())*d2r*Math.cos((p1.lat()+p2.lat())/2*d2r);
        var y = (p1.lat()-p2.lat())*d2r;
        return Math.sqrt(x*x + y*y)*this.earthRadius;
    },
    showPanorama : function () {
        if (!this.panoramaPointsAndHeadings) return;
        var count = this.panoramaPointsAndHeadings.length;
        if (this.panoramaIndex < 0) this.panoramaIndex = 0;
        else if(this.panoramaIndex >=  count) this.panoramaIndex = count -1;
        var item = this.panoramaPointsAndHeadings[this.panoramaIndex];
        var pt = item[0];
        var heading = item[1];
        var self = this;
        this.streetViewService.getPanoramaByLocation(pt, 50, function (data, status){
            if (status == google.maps.StreetViewStatus.OK) {
                self.panorama.setPano(data.location.pano);
                self.panorama.setPov({heading: heading, zoom: 1, pitch: 0});
                self.panorama.setVisible(true);
            }
            else {

            }
        });
 
        $("#panorama_box").dialog('open');
        
        $('#panorama_index_count').html((this.panoramaIndex+1).toString() + '/' + count.toString());
        this.map.setCenter(pt);
    },
    
    nextPanorama : function (){
        this.panoramaIndex ++;
        this.showPanorama();
    },

    prevPanorama : function (){
        this.panoramaIndex --;
        this.showPanorama();
    },
    backwardPanorama : function (){
        this.panoramaIndex -= 10;
        this.showPanorama();
    },
    forwardPanorama : function () {
        this.panoramaIndex += 10;
        this.showPanorama();
    },
    interpolatePoints : function(pt1, pt2, r) {
      return new google.maps.LatLng(r*pt2.lat() + (1-r)*pt1.lat(), r*pt2.lng() + (1-r)*pt1.lng());
    },
    getPanoramaPointsAndHeadings: function () {
        if (!this.pathEditor.selection) return null;
        var pph = [];
        var path = this.pathEditor.selection.getPath();
        var count = path.getLength();
        var way = 0;
        var dsum = 0;
        for (var i= 0; i < count-1; i++) {
            var pt1 = path.getAt(i);
            var pt2 = path.getAt(i+1);
            var d = this.getDistance(pt1, pt2);
            var h = this.getHeading(pt1, pt2);
            
            while(way < dsum+d ) {
                var pt = this.interpolatePoints(pt1, pt2, (way - dsum)/d);
                pph.push([pt, h]);
                way += this.panoramaInterval;
            }
            dsum += d;
        }
        pph.push([pt2, h]);
        return pph;

    }


}




