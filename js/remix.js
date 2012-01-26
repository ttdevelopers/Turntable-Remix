var remixBase = $('#remix').data('base');
var remixLog  = function(a) { console.log(util.nowStr()+' Remix >> '+a); }

//DEBUG_MODE=1;

var loadJavascript = function(f,g,h) {
  var d = new jQuery.Deferred();
  
  var js = document.createElement('script');
  js.src = remixBase + 'js/'+f+'.js?v=' + Date.now();
  if (h&&h.url) {
    js.src = h.url+f+'.js';
  }
  document.body.appendChild(js);

  setTimeout(function() {
    if (!h && window[g]) {
      d.resolve()
    }
    else if (h && !h.false && window[g]) {
      d.resolve()
    }
    else if (h && h.false && !window[g]) {
      d.resolve()
    }
    else {
      setTimeout(function(a) { a(); }, 50, arguments.callee)
    }
  }, 50)
  return d.promise(); 
}

$.when(
  loadJavascript('reset', 'io', {false: true})
).then(function(){
  remixLog('reset.js loaded..')
  $.when(
    loadJavascript('now', 'now', {url: 'http://turntableremix.com:3010/nowjs/'})
  ).then(function() {
    remixLog('now.js loaded..')
    $.when(
      loadJavascript('underscore', '_')
    ).then(function() {
      remixLog('underscore.js loaded..')
      $.when(
        loadJavascript('backbone', 'Backbone')
      ).then(function() {
        remixLog('backbone.js loaded..')
        $.when(
          loadJavascript('script', 'versionCheck')
        ).then(function() {
          remixLog('turntable remix loaded :D')
        })
      })
    })
  })
})

var css = document.createElement('link');
css.rel =  'stylesheet';
css.type = 'text/css';
css.href = remixBase + 'css/style.css?v=' + Date.now();   
document.body.appendChild(css);
