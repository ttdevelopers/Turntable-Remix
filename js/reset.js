// Prepare to overwrite Socket.io with newer version 
// for NowJS support
//io=null;

// Prevent "event.layerX and event.layerY are broken and deprecated in WebKit. They will be removed from the engine in the near future."
// in latest Chrome builds.
(function () {
    // remove layerX and layerY
    var all = $.event.props,
        len = all.length,
        res = [];
    while (len--) {
        var el = all[len];
        if (el != 'layerX' && el != 'layerY') res.push(el);
    }
    $.event.props = res;
} ());