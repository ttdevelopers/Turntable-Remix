(function() {
	var inject = function(type, file) {
		if (type=='js') {
		    el = document.createElement('script');
		    el.src = file;
		}
		if (type=="css") {
		    el = document.createElement('link');
		    el.rel = "stylesheet";
		    el.type = "text/css";
		    el.href = file;					
		}
	    document.body.appendChild(el);		
	}

    inject('js', chrome.extension.getURL("js/reset.js?v=1_" + new Date().getTime()));   
    inject('js', chrome.extension.getURL("js/backbone.js?v=1_" + new Date().getTime()));   
    inject('js', chrome.extension.getURL("js/script.js?v=1_" + new Date().getTime()));   
    inject('css', chrome.extension.getURL("css/style.css?v=1_" + new Date().getTime()));   

})()

