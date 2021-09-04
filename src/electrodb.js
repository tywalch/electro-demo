const ElectroDB = require("electrodb");
window.Prism = window.Prism || {};
const appDiv = document.getElementById('param-container');

function printToScreen(val) {
    const innerHtml = appDiv.innerHTML;
    appDiv.innerHTML = innerHtml + `<pre><code class="language-json">${val}</code></pre><hr>`;
}

function clearScreen() {
    appDiv.innerHTML = '';
}

class Entity extends ElectroDB.Entity {
    constructor(...params) {
        super(...params);
        this.client = {};
    }
    _queryParams(state, config) {
        const params = super._queryParams(state, config);
        printToScreen(JSON.stringify(params, null, 4));
        return params;
    }

    _params(state, config) {
        // @ts-ignore
        const params = super._params(state, config);
        printToScreen(JSON.stringify(params, null, 4));
        return params;
    }

    go(type, params) {
        printToScreen(JSON.stringify(params, null, 4));
    }
}

class Service extends ElectroDB.Service {}


window.ElectroDB = {
    Entity,
    Service,
    printToScreen,
    clearScreen
};