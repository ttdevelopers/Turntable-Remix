require(['remix'], function(Remix) {

	window.remixBase = $('script[src$="require.js"]').data('base');	
	
	var css = document.createElement('link');
	css.rel = 'stylesheet';
	css.href = remixBase + 'css/remix.css';
	
	document.body.appendChild(css);
	
});