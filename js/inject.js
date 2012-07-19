var js = document.createElement('script');
js.setAttribute('data-base', chrome.extension.getURL('/'));
js.setAttribute('data-main', chrome.extension.getURL('js/main.js'));
js.src = chrome.extension.getURL('js/require.js');
document.body.appendChild(js);