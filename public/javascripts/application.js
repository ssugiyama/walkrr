// Place your application-specific JavaScript functions and classes here
// This file is automatically included by javascript_include_tag :defaults

var Walkrr = function (){
    var defaultPos = new google.maps.LatLng(35.690,139.70);
    var defaultRadius = 500;
    var options = {
        zoom: 13,
        center: defaultPos,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDoubleClickZoom: true,
        scaleControl: true
    };
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
    google.maps.event.addListener(this.pathEditor, 'selection_changed', function () {
        if (this.selection)  jQuery("#editing_label").show();
        else jQuery("#editing_label").hide();
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

    var frame = jQuery("#import_frame");

    frame.load(function () {
        self
        .getImportPath(frame);
    });
}

var walk;


jQuery(document).ready(function (){
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
    }
}




