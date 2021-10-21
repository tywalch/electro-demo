window.electroParams = window.electroParams || [];
const defaultParameters = [
    {
        title: "<h2>Performs an <b>Update</b> operation, on the entity <b>Tasks</b></h2>",
        json: {
            "UpdateExpression": "SET #status = :status_u0, #comments = list_append(#comments, :comments_u0), #closed = :closed_u0, #updatedAt = :updatedAt_u0, #gsi1sk = :gsi1sk_u0, #gsi2sk = :gsi2sk_u0, #team = :team_u0, #project = :project_u0, #task = :task_u0, #__edb_e__ = :__edb_e___u0, #__edb_v__ = :__edb_v___u0 ADD #tags :tags_u0",
            "ExpressionAttributeNames": {
                "#status": "status",
                "#tags": "tags",
                "#comments": "comments",
                "#closed": "closed",
                "#updatedAt": "updatedAt",
                "#gsi1sk": "gsi1sk",
                "#gsi2sk": "gsi2sk",
                "#team": "team",
                "#project": "project",
                "#task": "task",
                "#__edb_e__": "__edb_e__",
                "#__edb_v__": "__edb_v__"
            },
            "ExpressionAttributeValues": {
                ":status0": "in-progress",
                ":status_u0": "on-hold",
                ":tags_u0": [
                    "half-baked"
                ],
                ":comments_u0": [
                    {
                        "user": "janet",
                        "body": "This seems half-baked."
                    }
                ],
                ":closed_u0": "",
                ":updatedAt_u0": 1634786167666,
                ":gsi1sk_u0": "$assignments#tasks_1#status_on-hold",
                ":gsi2sk_u0": "$tasks_1#team_green#closed_",
                ":team_u0": "green",
                ":project_u0": "core",
                ":task_u0": "45-6620",
                ":__edb_e___u0": "tasks",
                ":__edb_v___u0": "1"
            },
            "TableName": "your_table_name",
            "Key": {
                "pk": "$taskapp#team_green",
                "sk": "$tasks_1#project_core#task_45-6620"
            },
            "ConditionExpression": "#status = :status0"
        }
    }, {
        title: "<h2>QUERIES THE ACCESS PATTERN <b>BACKLOG</b>, ON THE ENTITY <b>TASKS</b>, BY <b>PROJECT</b>, <b>TEAM</b>, AND <b>CLOSED</b></h2>",
        json: {
            "TableName": "your_table_name",
            "ExpressionAttributeNames": {
                "#titleLowerCase": "titleLowerCase",
                "#pk": "gsi2pk",
                "#sk1": "gsi2sk"
            },
            "ExpressionAttributeValues": {
                ":titleLowerCase0": "database",
                ":pk": "$taskapp#project_core",
                ":sk1": "$tasks_1#team_green#closed_2021-01",
                ":sk2": "$tasks_1#team_green#closed_2021-07"
            },
            "KeyConditionExpression": "#pk = :pk and #sk1 BETWEEN :sk1 AND :sk2",
            "IndexName": "gsi2pk-gsi2sk-index",
            "FilterExpression": "contains(#titleLowerCase, :titleLowerCase0)"
        }
    }, {
        title: "<h2>Queries the collection <b>Assignments</b>, on the service <b>Taskapp</b>, by <b>user</b></h2>",
        json: {
            "KeyConditionExpression": "#pk = :pk and begins_with(#sk1, :sk1)",
            "TableName": "your_table_name",
            "ExpressionAttributeNames": {
                "#points": "points",
                "#pk": "gsi1pk",
                "#sk1": "gsi1sk"
            },
            "ExpressionAttributeValues": {
                ":points0": 1,
                ":points1": 5,
                ":pk": "$taskapp#user_d.huynh",
                ":sk1": "$assignments"
            },
            "IndexName": "gsi1pk-gsi1sk-index",
            "FilterExpression": "attribute_not_exists(#points) OR (#points between :points0 and :points1)"
        }
    }, {
        title: "<h2>PERFORMS A <b>PUT</b> OPERATION, ON THE ENTITY <b>USER</b></h2>",
        json: {
            "Item": {
                "team": "purple",
                "user": "t.walch",
                "title": 1,
                "manager": "d.purdy",
                "firstName": "tyler",
                "lastName": "walch",
                "profile": {
                    "photo": "selfie.jpg",
                    "bio": "makes things",
                    "location": "atlanta"
                },
                "following": [
                    "d.purdy"
                ],
                "createdAt": 1631063640036,
                "updatedAt": 1631063640036,
                "pk": "$taskapp#team_purple",
                "sk": "$organization#user_1#user_t.walch",
                "gsi1pk": "$taskapp#user_t.walch",
                "gsi1sk": "$assignments#user_1",
                "__edb_e__": "user",
                "__edb_v__": "1"
            },
            "TableName": "your_table_name",
            "ConditionExpression": "attribute_not_exists(pk) AND attribute_not_exists(sk)"
        }
    }
];

const RECENT_PARAMS_KEY = "recent";

function debounce(func, timeout = 300){
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, timeout);
    };
}

function trimHash(hash) {
    const length = hash.length;
    return hash.substring(length, length - 20);
}

function getCurrentHash(val) {
    if (typeof val === "string") {
        return trimHash(val);
    } else if (location.hash.startsWith('#code')) {
        return trimHash(location.hash);
    }
}

function getRecentParams() {
    try {
        const stored = window.sessionStorage.getItem(RECENT_PARAMS_KEY);
        return JSON.parse(stored || "[]");
    } catch(err) {
        window.sessionStorage.setItem(RECENT_PARAMS_KEY, "[]");
    }
}

function setParamStorage(hash, params) {
    let recent = getRecentParams() || [];
    let found = recent.find(stored => stored.hash === hash);
    if (found && found.params === undefined) {
        // incorrectly saved, clean up the hash
        recent = recent.filter(stored => stored.hash !== hash);
    }
    if (found && found.params) {
        return found.params;
    } else if (recent.length > 10) {
        const [oldest, ...rest] = recent;
        window.sessionStorage.setItem(RECENT_PARAMS_KEY, JSON.stringify(rest.concat({hash, params})));
        return params;
    } else {
        window.sessionStorage.setItem(RECENT_PARAMS_KEY, JSON.stringify(recent.concat({hash, params})));
        return params;
    }
}

function getStartingParams() {
    const hash = getCurrentHash();
    if (hash) {
        const recent = getRecentParams();
        const found = recent.find(stored => stored.hash === hash);
        if (found && found.params) {
            return found.params;
        } else {
            return [];
        }
    } else {
        return defaultParameters || [];
    }
}

function saveStartingParams(incoming, params) {
    const hash = getCurrentHash(incoming);
    setParamStorage(hash, params);
}

function printEmpty() {
    window.ElectroDB.printMessage("info", "Write Entity or Service queries in the left pane to see generated params appear here!");
}

function exec(code, query) {
    window.ElectroDB.clearScreen();
    try {
        eval(code);
        if (Array.isArray(window.electroParams) && window.electroParams.length === 0) {
            printEmpty();
        }
        saveStartingParams(query, window.electroParams);
    } catch (e) {
        if (e.message === "Unexpected token 'export'") {
            printEmpty();
        } else {
            window.ElectroDB.printMessage("error", e.message);
        }
    }
    window.Prism.highlightAll();
}

function prepare(code) {
    code = code.replace(/import.*from .*/gi, "")
    code = code.replace(/Entity/g, "window.ElectroDB.Entity");
    code = code.replace(/Service/g, "window.ElectroDB.Service");
    return code;
}

(function load() {
    const parameters = getStartingParams() || [];
    if (parameters.length === 0) {
        printEmpty();
    }
    for (const param of parameters) {
        window.ElectroDB.printToScreen({params: param.json, state: param.title});
    }
    window.Prism.highlightAll();
})();

window.onmessage = function(e) {
    setTimeout(() => {
        try {
            const message = typeof e.data === "string"
                ? JSON.parse(e.data)
                : e.data;
            if (message.type === "code") {
                let {code, query} = message.data;
                code = prepare(code);
                exec(code, query);
            } else if (message.type === "error") {
                window.ElectroDB.printMessage("error", message.data);
            }
        } catch(err) {
            window.ElectroDB.printMessage("error", err.message);
            console.log(err);
        }
    }, 0);
};