
/**
*    a hack to fix History.js when it tried to decode '&' in the Google directions
*    address
*
*    https://github.com/browserstate/history.js/issues/257
**/
History.unescapeString = function(param) {
    return param; 
};

var map;
var xmarkers = [];
var redxUrl = 'assets/redx.png';

directionsService = new google.maps.DirectionsService();
directionsDisplay = new google.maps.DirectionsRenderer();

var elevatorOutages;
var septaStationCollection;
var showStations = true;

/**
    given a variable number of arguments, checking only input types, returns
    true if they all have non empty values, else returns false
**/
function all_values_exist() {
    for (var i = 0; i < arguments.length; i++) {
        input = arguments[i];
        if (input.val() == '') {
            return false;
        }
    }
    return true;
}

// Usage:
//   var data = { 'first name': 'George', 'last name': 'Jetson', 'age': 110 };
//   var querystring = EncodeQueryData(data);
//
function EncodeQueryData(data) {
    var ret = [];
    for (var d in data)
        ret.push(encodeURI(d) + "=" + encodeURI(data[d]));
    return ret.join("&");
}

/**
    use History.js to update the browser history when new addresses are entered
    into the search form
**/
function updateHistory() {
    History = window.History;
    History.init();

    queryData = [];
    for (var i = 0; i < arguments.length; i++) {
        inputName = arguments[i];
        input = $(inputName);
        id = input.attr('id');
        val = input.val();
        queryData[id] = val;
    }
    encodedQueryData = EncodeQueryData(queryData);
    History.pushState(null, null, "?" + encodedQueryData);
}

function fetchSeptaStations(callback) {

    console.log("fetching rail stations");
    $.getJSON("assets/rail_lines.json", function(json) {
        septaStationCollection = new SeptaStationCollection(json);

    }).success(function() {
        console.log("rail stations fetched");
        if (callback != null) {
            callback();
        }
    }).error(function() {
        console.error('was unable to get rail stations');
    });
};

function fetchElevatorOutages(callback) {
    url = "http://www.corsproxy.com/www3.septa.org/hackathon/elevator/";
    console.log('fetching elevator outages');
    $.getJSON(url, function(json) {
        // @TODO when there's a valid elevator outage, debug setting up
        // septa's elevator outage data
        elevatorOutages = [];

    }).success(function(json) {
        console.log(json);
        $.each(json.results, function(index, value) {
            console.log(value);
        });
        console.info("retreived elevator outages from unlockphilly.com; " +
            "there are currently " + elevatorOutages.length + " outages");
        if (callback != null) {
            callback();
        }
    }).error(function() {
        console.warn("unable to retreive station outages from url:");
        console.warn(url);
        outages = [];
    });
};

var GLeg = function(obj) {
    this.obj = obj;
}

GLeg.prototype.getSteps = function() {
    var steps = Array();
    for (i = 0; i < this.obj.steps.length; i++) {
        steps.push(new GStep(this.obj.steps[i]));
    }
    return steps;
}

/**
 *    a step along the journey
 **/
var GStep = function(obj) {
    this.obj = obj;
    this.departureStop = null;
    this.arrivalStop = null;
}

GStep.prototype.getRoute = function() {
    this.obj.transit.short_name;
}

GStep.prototype.getDepartureStop = function() {

    if (this.departureStop == null) {
        this.departureStop = new GStop(this.obj.transit.departure_stop);
    }
    return this.departureStop;
}

GStep.prototype.getArrivalStop = function() {

    if (this.arrivalStop == null) {
        this.arrivalStop = new GStop(this.obj.transit.arrival_stop);
    }
    return this.arrivalStop;
}

GStep.prototype.getInstructions = function() {
    return this.obj.instructions;
}

GStep.prototype.getTravelMode = function() {
    return this.obj.travel_mode;
}

GStep.prototype.getVehicleType = function() {
    return this.obj.transit.line.vehicle.type;
}

/**
    this class wraps a Google transit station json object
**/

var GStop = function(json) {
    this.json = json;
}

GStop.prototype.getName = function() {
    return this.json.name;
}

GStop.prototype.getLat = function() {
    return this.json.location.lat();
}

GStop.prototype.getLng = function() {
    return this.json.location.lng();
}

var SeptaStationCollection = function(obj) {
    this.stations = new Array();
    for (i = 0; i < obj.stations.length; i++) {
        this.stations.push(new SeptaStation(obj.stations[i]));
    }
    console.log('we have ' + this.stations.length + ' stations in collection');
}

SeptaStationCollection.prototype.setElevatorOutages = function(elevatorOutages) {
    self = this;
    $.each(elevatorOutages, function(index, outage) {
        station = self.getStation(outage.stop_name);
        station.setElevatorOutage(outage);
    });
}

SeptaStationCollection.prototype.getStationById = function(id) {
    self = this;

    foundStation = null;
    $.each(this.stations, function(index, station) {

        console.log(station.getId() + " " + id);
        // if the stop names and short names match, break out of the each
        if (station.getId() == id) {
            foundStation = station;
            return;
        }
    }); // each this.stations

    /**
        if we didn't find it, let's print some debug messages
    **/
    if (foundStation === null) {

        $.each(this.stations, function(index, station) {
            console.log("id:'" + id +
                "' station-id:'" + station.getId() + "'");
        });
    }

    return foundStation;
}

SeptaStationCollection.prototype.getStation = function(stopName, routeName) {
    self = this;

    // strip the stop name of the route name at the end
    if (stopName.substring(stopName.length - 6) == ' - MFL') {
        stopName = stopName.substring(0, stopName.length - 6);
    } else if (stopName.substring(stopName.length - 6) == ' - BSL') {
        stopName = stopName.substring(0, stopName.length - 6);
    }

    foundStation = null;
    $.each(this.stations, function(index, station) {

        // if the stop names and short names match, break out of the each
        if (stopName.toLowerCase().trim() == station.getName().toLowerCase().trim()) {
            foundStation = station;
            return;
        }

        // there are special cases
        else if (stopName == 'Arrott Transportation Center' &&
            station.getName() == 'Margaret & Orthodox Station') {
            foundStation = station;
            return;
        }
    }); // each this.stations

    /**
        if we didn't find it, let's print some debug messages
    **/
    if (foundStation === null) {

        $.each(this.stations, function(index, station) {
            console.log("test-stop-name:'" + stopName +
                "' septa-name:'" + station.getName() + "'");
        });
    }

    return foundStation;
}

var SeptaStation = function(obj) {
    this.obj = obj;
    this.outage = null;
}

SeptaStation.prototype.setElevatorOutage = function(outage) {
    this.outage = outage;
}

SeptaStation.prototype.getName = function() {
    return this.obj.stop_name;
}

SeptaStation.prototype.getId = function() {
    return this.obj._id;
}

SeptaStation.prototype.getRoute = function() {
    if (this.obj.MFL == 1) {
        return "MFL";
    } else if (this.obj.BSS == 1) {
        return "BSS";
    } else if (this.obj.PATCO == 1) {
        return "PATCO";
    }

    // Norristown High Speed Line
    else if (this.obj.NHSL == 1) {
        return "NHSL";
    } else {
        console.error("was unable to get route from the " +
            "following septa stations");
        console.error(this.obj);
    }
}

SeptaStation.prototype.isElevatorWorking = function() {
    return this.outage == null;
}

SeptaStation.prototype.hasElevator = function() {
    return this.obj.wheelchair_boarding == 1;
}

StopStatus = {
    NO_ELEVATOR: 0,
    ELEVATOR_WORKING: 1,
    ELEVATOR_NOT_WORKING: 2,
    toString: function(status) {
        if (status === StopStatus.NO_ELEVATOR) {
            return "no elevator";
        } else if (status === StopStatus.ELEVATOR_WORKING) {
            return "elevator working";
        } else if (status === StopStatus.ELEVATOR_NOT_WORKING) {
            return "elevator not working";
        }

        return "no idea what the status is";
    }
};

SeptaStation.prototype.getElevatorStatus = function() {

    if (this.hasElevator()) {

        if (!this.isElevatorWorking()) {
            return StopStatus.ELEVATOR_NOT_WORKING;
        } else {
            return StopStatus.ELEVATOR_WORKING;
        }

    } // this.hasElevator
    else {
        return StopStatus.NO_ELEVATOR;
    }
}

function MyResponse(response, septaStationCollection, elevatorOutages) {
    this.response = response;
    this.septaStationCollection = septaStationCollection;
    this.septaStationCollection.setElevatorOutages(elevatorOutages);
}

MyResponse.prototype.getWheelchairRoute = function(waypoints) {

    // can't use self, something wrong with scope here
    self_response = this;

    self_response.removeAllXMarkers();

    $.each(this.response.routes[0].legs, function(index, leg) {
        var leg = new GLeg(leg);

        $.each(leg.getSteps(), function(index, step) {

            if (step.getTravelMode() == 'TRANSIT' && step.getVehicleType() == 'SUBWAY') {

                departStop = step.getDepartureStop();
                arriveStop = step.getArrivalStop();

                departStop.getName();
                step.getRoute();
                arriveStop.getName();

                departingStation = self_response.septaStationCollection.getStation(
                    departStop.getName(), step.getRoute());

                arrivingStation = self_response.septaStationCollection.getStation(
                    arriveStop.getName(), step.getRoute());

                if (departingStation.getElevatorStatus() != StopStatus.ELEVATOR_WORKING) {

                    console.log('self follows');
                    console.log(self_response);
                    self_response.addXMarker(departStop.getLat(), departStop.getLng());

                    $('#messages').append('<p id = "bad">' + departStop.getName() + '<br/> ' + StopStatus.toString(departingStation.getElevatorStatus()) + '</p>');
                }

                if (arrivingStation.getElevatorStatus() != StopStatus.ELEVATOR_WORKING) {
                    self_response.addXMarker(arriveStop.getLat(), arriveStop.getLng());

                    $('#messages').append('<p id= "bad">' + arriveStop.getName() + '<br/> ' + StopStatus.toString(arrivingStation.getElevatorStatus()) + '</p>');
                }
            } // if TRANSIT AND SUBWAY
        }); // each leg.getSteps
    }); // each leg in route
}

MyResponse.prototype.removeAllXMarkers = function() {
    console.debug('removeAllXMarkers');
    for (i = 0; i < xmarkers.length; i++) {
        xmarkers[i].setMap(null);
    }
    xmarkers = new Array();
}

MyResponse.prototype.addXMarker = function(lng, lat) {
    var marker = new google.maps.Marker({
        position: new google.maps.LatLng(lng, lat),
        map: map,
        icon: {
            url: 'assets/redx.png',
            size: new google.maps.Size(30, 30),
            anchor: new google.maps.Point(15, 15),
            zIndex: 10000
        }
    });

    xmarkers.push( marker );
}

function loadMap() {
    var philadelphia = new google.maps.LatLng(39.9523400, -75.1637900);
    var mapOptions = {
        zoom: 10,
        center: philadelphia
    };
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
}

function stationToggle() {
    showStations = !showStations;

    if (showStations) {
        $("#messages").css("height", "");
    } else {
        $("#messages").css("height", "1.5em");
    }
}

function getDirections() {

    var startAddress = $('#startAddress').val();
    var endAddress = $('#endAddress').val();

    $("#messages").empty();
    $("#messages").append("<span class='messageHeader'> Stations with No Wheelchair Access " + "<br></span>");

    request = {
        origin: startAddress,
        destination: endAddress,
        provideRouteAlternatives: false,
        travelMode: google.maps.TravelMode.TRANSIT,
    };

    directionsService.route(request, function(response, status) {
        if (status == google.maps.DirectionsStatus.OK) {

            directionsDisplay.setMap(null);

            if (septaStationCollection == null) {

                fetchElevatorOutages(callback = function() {

                    fetchSeptaStations(callback = function() {

                        myRes = new MyResponse(response,
                            septaStationCollection,
                            elevatorOutages);
                        myRes.removeAllXMarkers();
                        directionsDisplay = new google.maps.DirectionsRenderer();
                        directionsDisplay.setMap(map);
                        myRes.getWheelchairRoute();
                        directionsDisplay.setDirections(myRes.response);

                    }); // fetchElevatorOutages

                }); // fetchSeptaStatons

            } // if septaStationCollection == null
            else {
                myRes = new MyResponse(response,
                    septaStationCollection,
                    elevatorOutages);
                myRes.removeAllXMarkers();
                directionsDisplay = new google.maps.DirectionsRenderer();
                directionsDisplay.setMap(map);
                myRes.getWheelchairRoute();
                directionsDisplay.setDirections(myRes.response);
            }
        } else {
            console.error('request failed with ' + status);
            console.error(response);
        }
    });
}