var js = document.createElement('script');
js.setAttribute('data-base', chrome.extension.getURL('/'));
js.src = chrome.extension.getURL("js/remix.js?v=1_" + new Date().getTime());
js.id='remix';
document.body.appendChild(js);