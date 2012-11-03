(function (global) {
    'use strict';
    
    var module = angular.module('walkApp', []);
    module.factory('walkService', function () {
	var service = function () {
	    var self = this;
	    
	    this.initMap = function (scope, elm) {
		var defaultPos = new google.maps.LatLng(35.690,139.70);
		var options = {
		    zoom: 13,
		    center: defaultPos,
		    mapTypeId: google.maps.MapTypeId.ROADMAP,
		    disableDoubleClickZoom: true,
		    scaleControl: true,
		    scrollwheel : false,
		    streetViewControl: true
		};

		self.map = new google.maps.Map(elm, options);	    
		self.distanceWidget = new google.maps.Circle({
		    strokeWeight: 2,
		    editable: true,
		    color: '#000',
		    center: defaultPos,
		    radius: 500,
		});
		
		google.maps.event.addListener(self.map, 'click', function (event) {
		    if(scope.searchForm.type == 'neighbor'){
			self.distanceWidget.setCenter(event.latLng);
		    }
		    else if(scope.searchForm.type == 'areas') {
			$.ajax({
			    url: '/add_area',
			    data: "latitude=" + event.latLng.lat() + "&longitude=" + event.latLng.lng(),
			    success : function (data) {
				self.addArea(data.jcode, data.the_geom);
			    },
			});
		    }
		});
		google.maps.event.addListener(this.map, 'center_changed', function () {
		    self.storeCenterAndZoom();
		});

		google.maps.event.addListener(this.map, 'zoom_changed', function () {
		    self.storeCenterAndZoom();
		});

		self.areas = {};
		self.pathManager = new PathManager({map: self.map});
		google.maps.event.addListener(self.pathManager, 'editable_changed', function () {
		    console.log('editable_changed');
		    scope.editable = self.pathManager.get('editable');
		    setTimeout(function () {scope.$digest();}, 0);
		});
		google.maps.event.addListener(self.pathManager, 'length_changed', function () {
		    console.log('length_changed');
		    scope.selectionLength = self.pathManager.get('length');
		    setTimeout(function () {scope.$digest();}, 0);
		});
		google.maps.event.addListener(self.pathManager, 'selection_changed', function () {
		    self.panoramaPointsAndHeadings = self.getPanoramaPointsAndHeadings();
		    if (self.pathManager.selection){
			if(scope.currentService == 'elevation') {
			    self.requestElevation();
			}
			else if (scope.currentService == 'panorama'){
			    self.panoramaIndex = 0;
			    self.showPanorama();
			    scope.panoramaIndex = self.panoramaIndex+1;
			    scope.panoramaCount = self.panoramaCount;
			}
		    }
		    else {
			scope.currentService = 'none';
		    }
		    setTimeout(function () {scope.$digest();}, 0);
		});
		
		self.elevator = new google.maps.ElevationService();
		self.serviceMarker = new google.maps.Marker({icon : 'http://maps.google.co.jp/mapfiles/ms/icons/yellow.png'});

		self.streetViewService = new google.maps.StreetViewService();
		self.panoramaIndex = 0;
		self.panoramaInterval = 50;
	
		self.loadCenterAndZoom();

	    };
	    this.importFile = function (file) {
		var reader = new FileReader();
		reader.addEventListener('loadend', function(e) {
		    var kml = $.parseXML(e.target.result);
		    var coordinates = $(kml).find('coordinates').text();
		    var pts = coordinates.split(/ /).map(function (item) {
			var ns = item.split(/,/);
			return new google.maps.LatLng(parseFloat(ns[1]), parseFloat(ns[0]));
		    });
		    var path = new google.maps.MVCArray(pts);
		    self.pathManager.showPath(path, true);
		});		
		reader.readAsText(file);
	    };
	    this.requestElevation = function (){
		var path = [];
		if (!this.pathManager.selection) return;
		this.pathManager.selection.getPath().forEach(function (elem,i){
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
	    };

	    this.plotElevation = function (results, status) {
		if (status == google.maps.ElevationStatus.OK) {
		    var elevations = results;
		    var elevationPath = [];
		    for (var i = 0; i < results.length; i++) {
			elevationPath.push(elevations[i].location);
		    }
		    this.elevationPath = elevationPath;
		    var data = [];
		    for (var i = 0; i < results.length; i++) {
			data.push([i, elevations[i].elevation]);
		    }
		    // Draw the chart using the data within its DIV.
//		    $(this.elevationBox).dialog('open');
		    
		    $.plot($(this.elevation), [data], {
			xaxis : {show: false}, 
			colors : ['#ff0000'],
			grid : { hoverable : true }, 
		    });
            
		}
	    };

	    this.showDistanceWidget = function (show) {
		if (show) {
		    this.distanceWidget.setMap(this.map);
		}
		else{
		    this.distanceWidget.setMap(null);		    
		}
	    };

	    this.showAreas = function (show) {
		for (var id in this.areas) {
		    var pg = self.areas[id];
		    pg.setMap(show?self.map:null);
		}
	    };
	    this.storeCenterAndZoom = function () {
		if (localStorage) {
		    var center = this.map.getCenter();
		    var array = [center.lat(), center.lng(), this.map.getZoom()];
		    localStorage['centerAndZoom'] = JSON.stringify(array);
		}
	    };
	    
	    this.loadCenterAndZoom =  function () {
		if (localStorage && localStorage['centerAndZoom']) {
		    var array = JSON.parse(localStorage["centerAndZoom"]);
		    var center = new google.maps.LatLng(array[0], array[1]);
		    this.map.setCenter(center);
		    this.map.setZoom(array[2]);
		}
	    };
	    this.addArea = function (id, str) {
		if (this.areas[id]) return;
		//        var pg = Walkrr.wkt2GMap(str);
		var paths = str.split(" ").map(function (element, index, array){
		    return google.maps.geometry.encoding.decodePath(element);
		});
		var pg =  new google.maps.Polygon({});
		pg.setPaths(paths);
		pg.setOptions(this.areaStyle);
		pg.setMap(this.map);
		this.areas[id] = pg;
		var self = this;
		google.maps.event.addListener(pg, 'click',  function () {
		    pg.setMap(null);
		    pg = null;
		    delete self.areas[id];
		});
	    };
	    
	    this.showPanorama = function () {
		if (!this.pathManager.selection) return;

		this.panoramaCount = this.panoramaPointsAndHeadings.length;

		if (this.panoramaIndex < 0) this.panoramaIndex = 0;
		else if(this.panoramaIndex >=  this.panoramaCount) this.panoramaIndex = this.panoramaCount -1;

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
			self.panorama.setVisible(false);
		    }
		});
 
		this.map.setCenter(pt);

	    };
    
	    this.interpolatePoints = function(pt1, pt2, r) {
		return new google.maps.LatLng(r*pt2.lat() + (1-r)*pt1.lat(), r*pt2.lng() + (1-r)*pt1.lng());
	    };
	    this.getPanoramaPointsAndHeadings = function () {
		if (!this.pathManager.selection) return null;
		var pph = [];
		var path = this.pathManager.selection.getPath();
		var count = path.getLength();
		var way = 0;
		var dsum = 0;
		for (var i= 0; i < count-1; i++) {
		    var pt1 = path.getAt(i);
		    var pt2 = path.getAt(i+1);
		    var d = google.maps.geometry.spherical.computeDistanceBetween(pt1, pt2);
		    var h = google.maps.geometry.spherical.computeHeading(pt1, pt2);
		    
		    while(way < dsum+d ) {
			var pt = this.interpolatePoints(pt1, pt2, (way - dsum)/d);
			pph.push([pt, h]);
			way += this.panoramaInterval;
		    }
		    dsum += d;
		}
		pph.push([pt2, h]);
		return pph;

	    };
	    
	};

	return new service();
    });

    module.directive('myMap', function (walkService){
	return function (scope, elm, attrs) {
	    walkService.initMap(scope, angular.element(elm)[0]);

	    $(elm).bind("drop", function (e) {
		e.stopPropagation();
		e.preventDefault();
		var files = e.originalEvent.dataTransfer.files;
		walkService.importFile(files[0]);
	    }).bind("dragenter", function (e) {
		e.stopPropagation();
		e.preventDefault();
	    }).bind("dragover", function (e) {
		e.stopPropagation();
		e.preventDefault();
	    });

	};
    });

    module.directive('myPanorama', function (walkService){
	return function (scope, elm, attrs) {
	    walkService.panorama = new google.maps.StreetViewPanorama(angular.element(elm)[0], 
								      {
									  addressControl: true, 
									  navigationControl: true,
									  enableCloseButton: true,
								      });
	    google.maps.event.addListener(walkService.panorama, 'closeclick',  function (ev) {
		scope.currentService = 'none';
	    });
	    walkService.map.setStreetView(walkService.panorama);

	};
    });

    
    module.directive('myElevation', function (walkService){
	return function (scope, elm, attrs) {
	    walkService.elevation = elm;
	    $(elm).on("plothover", function (event, pos, item) {
	     	var point = walkService.elevationPath[~~pos.x];
		if (!point) return;
	     	walkService.serviceMarker.setMap(walkService.map);
	     	walkService.serviceMarker.setPosition(point);
	     	walkService.map.setCenter(point);
	    });
	    $(elm).on("mouseout", function () {
		walkService.serviceMarker.setMap(null);
	    });
	};
    });
		     
    global.WalkController = function ($scope, $http, walkService) {
	var self = this;
	
//	$scope.selectionLength = 0;

	function searchCallback (data) {
	    if (data.current_page > 1) {
		$scope.walks.push.apply($scope.walks, data.items);
	    }
	    else {
		$scope.walks = data.items;
	    }
	    $scope.params = data.params;
	    $scope.total_count = data.total_count;
	    
	    if (data.total_count == 1 && data.items[0].path) {
		walkService.pathManager.showPath(data.items[0].path, true);
	    }
	    $scope.result = {};
	    data.items.forEach(function (item, index, array) {
		$scope.result[item.id] = false;
	    });
	}

	
	if (location.search) {
	    $http.get('/search' + location.search).success(function (data) {
		searchCallback(data);
	    });
	}
	
	$scope.currentService = 'none';
	$scope.searchForm = {};
	$scope.searchForm.type = 'all';
	$scope.searchForm.order = "new_first";
	$scope.searchForm.per_page = 20;
	$scope.search = function () {
	    if ($scope.searchForm.type == 'neighbor') {
		$scope.searchForm.latitude = walkService.distanceWidget.getCenter().lat();
		$scope.searchForm.longitude = walkService.distanceWidget.getCenter().lng();
		$scope.searchForm.radius = walkService.distanceWidget.getRadius();
	    }
	    else {
		$scope.searchForm.latitude = "";
		$scope.searchForm.longitude = "";
		$scope.searchForm.radius = "";
	    }
	    if ($scope.searchForm.type == 'areas') {
		$scope.searchForm.areas = Object.keys(walkService.areas).join(",");
	    }
	    else {
		$scope.searchForm.areas = "";
	    }

	    if ($scope.searchForm.type == 'cross') {
		console.log(walkService.pathManager.getEncodedSelection());
		$scope.searchForm.searchPath = walkService.pathManager.getEncodedSelection();
	    }
	    else {
		$scope.searchForm.searchPath = "";
	    }
	    
	    $http.get('/search?' + $.param($scope.searchForm)).success(searchCallback);
   
	};
	$scope.getNext = function (params) {
	    $http.get('/search?' + params).success(searchCallback);
	};

	$scope.loadPath = function () {
	    walkService.pathManager.loadFromLocalStorage();
	};
	$scope.showPath = function (id) {
	    
	    $http.get('/show/' + id).success(function (data) {
		if (data.length > 0) {
		    $scope.selection = data[0];
		    walkService.pathManager.showPath(data[0].path, true);
		}
	    }).error(function (data) {
		alert(data);
	    });
	    return false;
	    
	};
	$scope.showPaths = function () {
	    var ids =  Object.keys($scope.result);

	    $http.post('/show' , {id : ids}).success(function (data) {
		for (var i = 0; i < data.length; i++) {
		    walkService.pathManager.showPath(data[i].path, false);
		}
	    }).error(function (data) {
		alert(data);
	    });
	    return false;
	    
	};

	$scope.download = function (id) {
	    window.location.href= "/export/" + id;
	};
	$scope.export = function () {
	    var ids =  Object.keys($scope.result).filter(function (item, index, array) {
		return $scope.result[item];
	    });
	    var form = $('#result_form').clone();
	    form.attr({
		method : 'POST',
		action : '/export'
	    });
	    form.submit();
	};
	
	$scope.checkAllResult = function () {
	    for (var item in $scope.result) {
		$scope.result[item] = true;
	    }
	    return false;
	};

	$scope.resetResult = function () {
	    for (var item in $scope.result) {
		$scope.result[item] = false;
	    }
	    return false;
	};

	$scope.deletePath = function ()  {
	    walkService.pathManager.deletePath();
	};
	$scope.deleteAll = function ()  {
	    walkService.pathManager.deleteAll();
	};

	$scope.destroy = function () {
	  if ($scope.selection.id && confirm('Are you shure to delete?')) {
	      $http.get('/destroy/' + $scope.selection.id).success(function (data) {
		  $scope.selection = {};
	      }).error(function (data) {
		  alert(data);
	      });
	  }
	};
	$scope.save = function () {
	    $scope.selection.path = walkService.pathManager.getEncodedSelection();
	    $http.post('/save', $scope.selection).success(function (data) {
		$scope.selection = data;
		alert('saved successfully!');
	    }).error(function (data) {
		alert(data);
	    });
	};
	$scope.resetAdminForm = function () {
	    $scope.selection = {};
	};
	$scope.showElevation = function () {
	    $scope.currentService = 'elevation';
	    walkService.requestElevation();
	};
	$scope.showPanorama = function () {

	    walkService.panorama.setVisible(true);
	    walkService.showPanorama();
	    $scope.currentService = 'panorama';
	    $scope.panoramaIndex = walkService.panoramaIndex+1;
	    $scope.panoramaCount = walkService.panoramaCount;

	};
	$scope.closeService = function () {
	    $scope.currentService = 'none';
	}
	$scope.$watch('searchForm.type', function (newValue, prevValue) {
	    walkService.showDistanceWidget(newValue == 'neighbor');
	    walkService.showAreas(newValue == 'areas');
	});
	$scope.$watch('editable', function (newValue, prevValue) {
	    if (walkService.pathManager.get('editable') != newValue)
		walkService.pathManager.set('editable', newValue);
	});
	$scope.$watch('currentService', function (newValue, prevValue) {
	    $scope.mapClass = 'map-with-' + newValue;
	    setTimeout(function () {
		google.maps.event.trigger(walkService.map, 'resize');
	    }, 0);
	});

	$scope.nextPanorama = function (){
	    walkService.panoramaIndex ++;
	    walkService.showPanorama();
	    $scope.panoramaIndex = walkService.panoramaIndex+1;
	};
	
	$scope.prevPanorama = function (){
	    walkService.panoramaIndex --;
	    walkService.showPanorama();
	    $scope.panoramaIndex = walkService.panoramaIndex+1;
	};
	$scope.backwardPanorama = function (){
	    walkService.panoramaIndex -= 10;
	    walkService.showPanorama();
	    $scope.panoramaIndex = walkService.panoramaIndex+1;
	};
	$scope.forwardPanorama = function () {
	    walkService.panoramaIndex += 10;
	    walkService.showPanorama();
	    $scope.panoramaIndex = walkService.panoramaIndex+1;
	};
	$(document).bind("drop", function (e) {
	    e.stopPropagation();
	    e.preventDefault();
	}).bind("dragenter", function (e) {
	    e.stopPropagation();
	    e.preventDefault();
	}).bind("dragover", function (e) {
	    e.stopPropagation();
	    e.preventDefault();
	});
	
    };

})(this);
