var map;
directionsService = new google.maps.DirectionsService();
directionsDisplay = new google.maps.DirectionsRenderer();

var outages;
var railStations;
var showStations= true;


function getrailStations() {

    console.log( 'getting rail lines' );
    $.getJSON("rail_lines.json", function(json) {
        railStations = json;
    });
};

function getOutages() {
    url = "http://www.corsproxy.com/www.unlockphilly.com/septa/elevator/outages";
    $.getJSON(url, function(json) {
        outages = json;
    }).success( function() {
        console.debug("successfully retreived elevator outages");
        console.debug("there are " + outages.length + " elevator outages");
    }).error( function() {
        console.warn("unable to retreive station outages from url:");
        console.warn(url);
        outages = [];
    });
};

function MyResponse( response ) {
    this.response = response;
}

StopStatus = {
    NO_ELEVATOR : 0,
    ELEVATOR_WORKING : 1,
    ELEVATOR_NOT_WORKING : 2,
    toString: function( status ) {
        if( status === StopStatus.NO_ELEVATOR ) {
            return "no elevator";
        }
        else if( status === StopStatus.ELEVATOR_WORKING ) {
            return "elevator working";
        }
        else if( status === StopStatus.ELEVATOR_NOT_WORKING ) {
            return "elevator not working";
        }

        return "no idea what the status is";
    }
};

MyResponse.prototype.getWheelchairRoute = function( waypoints ) {
    
    self = this;

    var legs = this.response.routes[0].legs;

    transitStops = [];

    $.each( legs, function(index, leg ) {
        
        $.each( leg.steps, function( index, step ) {
            var instructions = step.instructions;
           
            //console.log( 'step: ' + instructions + " transit_detail follows" );

            if( step.travel_mode == 'TRANSIT' ) {
                vehicleType = step.transit.line.vehicle.type;

                console.log( 'outside vehicle type: ' + vehicleType );
                if( vehicleType != 'BUS' && vehicleType != 'TRAM' ) { // is not a bus stop
                    console.log( step.transit.line.short_name );
                    lineShortName = step.transit.line.short_name;
                    

                    //console.log( 'inside vehicle type: ' + vehicleType + ' short line name ' + lineShortName );
                    //console.log( step.transit.line );
                    departStopName = step.transit.departure_stop.name;
                    arriveStopName = step.transit.arrival_stop.name;

                    departStatus = self.getElevatorStatus( departStopName, lineShortName );
                    arriveStatus = self.getElevatorStatus( arriveStopName, lineShortName );

                    console.log( 'departure stop ' + departStopName + "status: " + StopStatus.toString( departStatus ) );
                    console.log( 'arriaval stop ' + arriveStopName + " status: " + StopStatus.toString( arriveStatus ) );

                    if( departStatus != StopStatus.ELEVATOR_WORKING && departStatus != null) {

                        departureStop = step.transit.departure_stop;
                        lat = departureStop.location.lat();
                        lng = departureStop.location.lng();
                        self.addXMarker(lat,lng);

                        $('#messages').append('<p id = "bad">' + departStopName + '<br/> ' 
                            + StopStatus.toString( departStatus ) + '</p>');
                        
                        self.getClosestStation( lat, lng );
                    }

                    if( arriveStatus != StopStatus.ELEVATOR_WORKING && arriveStatus != null) {

                        arrivalStop = step.transit.arrival_stop;
                        lat = arrivalStop.location.lat();
                        lng = arrivalStop.location.lng();
                        self.addXMarker( lat,lng );

                        $('#messages').append ('<p id= "bad">' +  arriveStopName + '<br/> '
                         + StopStatus.toString( arriveStatus ) + '</p>');

                        self.getClosestStation( lat, lng );
                    }
                }
            }
            else {
                //console.log( 'step follows' );
                //console.log( step.instructions );
            }
        });
        
    } );
}

MyResponse.prototype.getClosestStation = function(lat,lng) {

    var url = "http://www3.septa.org/hackathon/locations/get_locations.php?lon="+lng+"&lat="+lat+"&radius=3&jsoncallback=?"
    $.getJSON(url,function(result) {
        console.log( 'result of getClosestStation' );
        console.log( result );
    });
}

MyResponse.prototype.addXMarker = function(lng,lat) {
    var image = {
        url: 'assets/redx.png',
    };

    var marker = new google.maps.Marker({
          position: new google.maps.LatLng( lng, lat ),
          anchor: new google.maps.Point(0, 1000),
          map: map,
          icon: image,
          zIndex: 10000
    });

    return marker;
}

MyResponse.prototype.getElevatorStatus = function( stopName, lineShortName ) {
    self = this;

    stationObj = this.getSeptaStation( stopName, lineShortName );

    if( this.hasElevator( stationObj ) ) {

        if( self.isStationOnOutageList( stationObj ) ) {
            return StopStatus.ELEVATOR_NOT_WORKING;
        }
        else {
            return StopStatus.ELEVATOR_WORKING;
        }

    } else {
        return StopStatus.NO_ELEVATOR;
    }
}

// return whether the given station object has an elevator
MyResponse.prototype.hasElevator = function( stationObj ) {

    if(stationObj != null) {
        if( stationObj.wheelchair_boarding != null ) {
            return true; 
        }
    }

    return false;
}

MyResponse.prototype.isStationOnOutageList = function( stationObj ) {

    var onList = false;
    $.each( outages, function(index, outage) {
        console.log( 'in isStationOnOutageList stationObj:' );
        console.log( stationObj.stop_name );
        if( stationObj.stop_name == outage.stop_name ) {
            onList = true;
        }
        return; //break
    } );

    return onList;
}

MyResponse.prototype.getGoogleStationLineShortName = function( station ) {
    if( station.MFL == 1 ) {
        return "MFL";
    }
    else if( station.BSS == 1 ) {
        return "BSS";
    }
    console.log( "could not determine the short name for the following station" );
    console.log( station );
}
// get the station from railStations json issued by septa
MyResponse.prototype.getSeptaStation = function( stopName, lineShortName ) {
    self = this;
    foundStation = null;

    $.each( railStations.stations, function( index, station ) {

        if( stopName.toLowerCase() == station.stop_name.toLowerCase() 
            && lineShortName == self.getGoogleStationLineShortName( station ) ) {
                foundStation = station;
                return;
        }
    } );

    if( foundStation === null ) {

        msg = 'unable to find station in rail lines with name "' + stopName + '" shortName: ' + lineShortName;
        console.log( msg );
        $.each( railStations.stations, function( index, station ) {
            console.log( stopName + " " + station.stop_name );
        } );
    }

    return foundStation;
}

// return whether the station has a working elevator
MyResponse.prototype.isElevatorWorking = function( station ) {
    return station.wheelchair_boarding !== null;
}

function loadMap() {
    var philadelphia = new google.maps.LatLng(39.9523400,-75.1637900);
    var mapOptions = {
        zoom: 10,
        center: philadelphia
    };
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
}

function stationToggle() {
    console.log("toggle");
    showStations = !showStations;

     if(showStations) {
       $("#messages").css("height", "");
     } else {
        $("#messages").css("height", "1.5em");
     }
}

function getDirections() {

    var startAddress = $('#startAddress').val();
    var endAddress = $('#endAddress').val();

    $("#messages").empty();
    $("#messages").append("<span class='messageHeader'> Stations with Limited Access " + "<br></span>");

    console.log( "start address: " + startAddress + " end address: " + endAddress );

    request = {
        origin: startAddress,
        destination: endAddress,
        provideRouteAlternatives: false,
        travelMode: google.maps.TravelMode.TRANSIT,
    };

    directionsService.route(request, function(response, status) {
        if (status == google.maps.DirectionsStatus.OK) {

            directionsDisplay.setMap(null);

            myRes = new MyResponse( response );
     
            directionsDisplay = new google.maps.DirectionsRenderer();
            directionsDisplay.setMap(map);

            myRes.getWheelchairRoute();

            directionsDisplay.setDirections( myRes.response );
        }
        else {
            console.log( 'request failed with ' + status );
            console.log( response );
        }
    });
}