/*
    search for a debug_directions=true in the url parameters

    to set, add debug_directions=true to url, supply addresses to and add function "debug_directions"
    to the input

    it requires QueryString
*/

// we need QueryString, if we don't find it, report the error
if( typeof QueryString == 'undefined' ) {
    console.error( "must include QueryString javascript file to access" + 
        " map debugging functionality" );
} else {
    /**
        will set the value of the input to the parameter supplied
        in the url that has the same string as the input id
    **/
    jQuery.fn.set_input_value = function() {
        var input = $(this[0]) // It's your element
        var id = input.attr('id');
        var uriVal = QueryString[id];

        if( uriVal != '' && typeof uriVal != 'undefined' ) {
            console.log( 'set_input_value: setting ' + id + ' to ' + uriVal );
            input.val( decodeURIComponent( uriVal ) );
        }
    };
}

