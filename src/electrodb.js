const ElectroDB = require("electrodb");
window.Prism = window.Prism || {};
const appDiv = document.getElementById('param-container');

function aOrAn(value = "") {
    return ["a", "e", "i", "o", "u"].includes(value[0].toLowerCase())
        ? "an"
        : "a"
}

function properCase(str = "") {
    let newStr = "";
    for (let i = 0; i < str.length; i++) {
        let value = i === 0
            ? str[i].toUpperCase()
            : str[i];
        newStr += value;
    }
    return newStr;
}

function formatProper(value) {
    return formatStrict(properCase(value));
}

function formatStrict(value) {
    return `<b>${value}</b>`
}

function formatProvidedKeys(pk = {}, sks = []) {
    let keys = {...pk};
    for (const sk of sks) {
        keys = {...keys, ...sk};
    }
    const provided = Object.keys(keys).map(key => formatStrict(key));
    if (provided.length === 0) {
        return "";
    } else if (provided.length === 1) {
        return provided[0];
    } else if (provided.length === 2) {
        return provided.join(" and ");
    } else {
        provided[provided.length - 1] = `and ${provided[provided.length - 1]}`;
        return provided.join(", ");
    }
}

function formatParamLabel(state, entity) {
    if (!state) {
        return null;
    } else if (typeof state === "string") {
        return state;
    } else {
        const method = state.query.method;
        const type = state.query.type;
        const collection = state.query.collection;
        const accessPattern = entity.model.translations.indexes.fromIndexToAccessPattern[state.query.index];
        const keys = formatProvidedKeys(state.query.keys.pk, state.query.keys.sk);
        if (collection) {
            return `<h2>Queries the collection ${formatProper(collection)}, on the service ${formatProper(entity.model.service)}, by ${keys}</h2>`;
        } else if (method === "query") {
            return `<h2>Queries the access pattern ${formatProper(accessPattern)}, on the entity ${formatProper(entity.model.name)}</h2>`;
        } else {
            return `<h2>Performs ${aOrAn(method)} ${formatProper(method)} operation, on the entity ${formatProper(entity.model.name)}</h2>`;
        }
    }
}

function printToScreen(params, state, entity) {
    const innerHtml = appDiv.innerHTML;
    const label = formatParamLabel(state, entity);
    let code = `<pre><code class="language-json">${JSON.stringify(params, null, 4)}</code></pre>`;
    if (label) {
        code = `<hr>${label}${code}`;
    } else {
        code = `<hr>${code}`;
    }
    appDiv.innerHTML = innerHtml + code;
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
        printToScreen(params, state, this);
        return params;
    }

    _batchWriteParams(state, config) {
        const params = super._batchWriteParams(state, config);
        printToScreen(params, state, this);
        return params;
    }

    _batchGetParams(state, config) {
        const params = super._batchGetParams(state, config);
        printToScreen(params, state, this);
        return params;
    }

    _params(state, config) {
        const params = super._params(state, config);
        printToScreen(params, state, this);
        return params;
    }

    go(type, params) {

    }
}

class Service extends ElectroDB.Service {}


window.ElectroDB = {
    Entity,
    Service,
    printToScreen,
    clearScreen
};