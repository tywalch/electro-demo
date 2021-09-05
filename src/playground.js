const display = document.getElementById('display');
const editor = document.getElementById("editor");
let existingUrl = document.location.href;

if (location.hash.startsWith('#code')) {
    editor.src = editor.src + location.hash;
    display.src = display.src + location.hash;
}

function sendCode(message) {
    display.contentWindow.postMessage(JSON.stringify(message), '*');
}

function sendLink(message) {
    const url = `${document.location.protocol}//${document.location.host}${document.location.pathname}${message.data}`;
    if (existingUrl !== url) {
        existingUrl = url;
        window.history.replaceState({}, "", url);
    }
}

function sendRedirect(message) {
    window.open(message.data, '_blank').focus();
}

function sendError(message) {
    display.contentWindow.postMessage(JSON.stringify(message), '*');
}

window.onmessage = function handleUpdates(e) {
    try {
        const message = JSON.parse(e.data) || {};
        switch(message.type) {
            case "code":
                sendCode(message);
                break;
            case "query":
                sendLink(message);
                break;
            case "redirect":
                sendRedirect(message);
                break;
            case "error":
                sendError(message);
                break;
        }
    } catch(err) {
        console.log({err, e});
    }
}