const display = document.getElementById('display');
const editor = document.getElementById("editor");
let existingUrl = document.location.href;

if (location.hash.startsWith('#code')) {
    editor.src = editor.src + location.hash;
}

function sendCode(message) {
    display.contentWindow.postMessage(message.data, '*');
}

function sendLink(message) {
    const url = `${document.location.protocol}//${document.location.host}${document.location.pathname}${message.data}`;
    if (existingUrl !== url) {
        existingUrl = url;
        window.history.replaceState({}, "", url);
    }
}

window.onmessage = function handleUpdates(e) {
    try {
        const message = JSON.parse(e.data);
        if (message.type === "code") {
            sendCode(message);
        } else if (message.type === "query") {
            sendLink(message)
        }
    } catch(err) {
        console.log({err, e});
    }
}