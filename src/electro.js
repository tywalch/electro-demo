const ElectroDB = require("./index");
window.Prism = window.Prism || {};
const appDiv = document.getElementById('param-container');

function printToScreen(val) {
    const innerHtml = appDiv.innerHTML;
    // if (window.Prism) {
    //     console.log("fn", window.Prism.highlight, window.Prism.highlight.toString());
    //     console.log("window.Prism.languages.json", Object.keys(window.Prism.languages), window.Prism.languages.JSON);
    //     // appDiv.innerHTML = innerHtml + window.Prism.highlight(val, window.Prism.languages.json, 'json');
    // } else {
    //     console.log("FUUUU", window, window.Prism);
    // }
    // appDiv.innerHTML = innerHtml + Prism.highlight(val, Prism.languages.json, 'json');
    appDiv.innerHTML = innerHtml + `<hr><pre><code class="language-json">${val}</code></pre>`;
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