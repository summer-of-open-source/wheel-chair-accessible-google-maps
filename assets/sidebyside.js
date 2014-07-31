/*$(document).ready( function() {
    console.log( 'started' );

    var url = 'http://gatekeeper.poplar.phl.io/api/otp/v1/ws/plan?fromPlace=1128%2C+Foulkrod+Street%2C+Northwood%2C+Philadelphia%2C+Philadelphia+County%2C+Pennsylvania%2C+19124%2C+United+States+of+America%3A%3A40.0218525714286%2C-75.0898801428571&        toPlace=601%2C+Market+Street%2C+Chinatown%2C+Philadelphia%2C+Philadelphia+County%2C+Pennsylvania%2C+19106%2C+United+States+of+America%3A%3A39.950835%2C-75.150517&time=8%3A34pm&date=07-15-2014&mode=TRANSIT%2CWALK&maxWalkDistance=750&arriveBy=false&showIntermediateStops=false&_=1405470890327&wheelchair=true&format=json'
        ;
    
    var myUrl = new OTUrl({
    });


    $.get(url,function(response) { 
        console.log( response ); 
    });
});
*/

var OTUrl = function() {
    this.root = 'http://gatekeeper.poplar.phl.io/api/otp/v1/ws/plan';

    this.data = {
        mode: "TRANSIT,WALK",
        maxWalkDistance: 750,
        arriveBy: false,
        showIntermediateStops: false,
        _: 1405470890327,
        format: 'json'
    };
}

OTUrl.prototype.getPlanUrl = function() {
    return 'http://gatekeeper.poplar.phl.io/api/otp/v1/ws/plan?&'+this.getParameters();
}

OTUrl.prototype.getParameters = function() {
    var str = [];
    for( var p in this.data ) {
        str.push( encodeURIComponent(p) + "=" + encodeURIComponent(this.data[p]));
    }

    return str.join('&');
}

OTUrl.prototype.setFromPlace = function(fromPlace) {
    this.data['fromPlace'] = decodeURIComponent(fromPlace);
}

OTUrl.prototype.setToPlace = function(toPlace) {
    this.data['toPlace'] = decodeURIComponent(toPlace);
}

OTUrl.prototype.setTime = function(time) {
    this.data['time'] = time;
}

OTUrl.prototype.setDate = function(date) {
    this.data['date'] = date;
}

OTUrl.prototype.setWheelchair = function(wheelchair) {
    this.data['wheelchair'] = wheelchair
}

OTUrl.prototype.setFormat = function(format) {
    this.data['format'] = format;
}

OTUrl.prototype.url = function() {

    var str = [];
    for( var p in this.data ) {
        str.push( encodeURIComponent(p) + "=" + encodeURIComponent(this.data[p]));
    }

    var url = this.root + "?" + str.join('&');
    return url;
}

OTUrl.prototype.bannRoute = function(str) {
    this.data['bannedRoutes'] = str;
}

OTUrl.prototype.getItineraryLink = function(itinNum) {
    return 'http://opentrips.phl.io/otp-leaflet-client/?module=planner&'
        + this.getParameters() + "&itinIndex=" + itinNum;
}

var OTResponse = function(json) {
    this.json = json;

    this.debug = this.json.debug;
    this.error = this.json.error;
    this.from = this.json.from;
    this.itineraries = this.json.itineraries;
}

OTResponse.prototype.getDuration = function() {
    return this.json.plan.itineraries[0].duration;
}

OTResponse.prototype.getItineraries = function() {
    return this.json.plan.itineraries;
}
