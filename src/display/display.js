window.electroParams = window.electroParams || [];
const defaultParameters = [
    {
        title: "<h2>Performs an <b>Update</b> operation, on the entity <b>Tasks</b></h2>",
        json: {
            "UpdateExpression": "SET #status = :status_u0, #comments = list_append(#comments, :comments_u0), #updatedAt = :updatedAt_u0, #gsi1sk = :gsi1sk_u0 ADD #tags :tags_u0",
            "ExpressionAttributeNames": {
                "#status": "status",
                "#tags": "tags",
                "#comments": "comments",
                "#updatedAt": "updatedAt",
                "#gsi1sk": "gsi1sk"
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
                ":updatedAt_u0": 1630822569618,
                ":gsi1sk_u0": "$assignments#tasks_1#status_on-hold"
            },
            "TableName": "your_table_name",
            "Key": {
                "pk": "$taskapp#team_green",
                "sk": "$tasks_1#project_core#task_45-6620"
            },
            "ConditionExpression": "attribute_exists(pk) AND attribute_exists(sk) AND #status = :status0"
        }
    }, {
        title: "<h2>QUERIES THE ACCESS PATTERN <b>BACKLOG</b>, ON THE ENTITY <b>TASKS</b></h2>",
        json: {
            "UpdateExpression": "SET #status = :status_u0, #comments = list_append(#comments, :comments_u0), #updatedAt = :updatedAt_u0, #gsi1sk = :gsi1sk_u0 ADD #tags :tags_u0",
            "ExpressionAttributeNames": {
                "#status": "status",
                "#tags": "tags",
                "#comments": "comments",
                "#updatedAt": "updatedAt",
                "#gsi1sk": "gsi1sk"
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
                ":updatedAt_u0": 1630822569618,
                ":gsi1sk_u0": "$assignments#tasks_1#status_on-hold"
            },
            "TableName": "your_table_name",
            "Key": {
                "pk": "$taskapp#team_green",
                "sk": "$tasks_1#project_core#task_45-6620"
            },
            "ConditionExpression": "attribute_exists(pk) AND attribute_exists(sk) AND #status = :status0"
        }
    }, {
        title: "<h2>PERFORMS A <b>PUT</b> OPERATION, ON THE ENTITY <b>USER</b></h2>",
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
                "createdAt": 1630850314247,
                "updatedAt": 1630850314247,
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

function getCurrentHash(val) {
    if (typeof val === "string") {
        return val.substring(0, 20);
    } else if (location.hash.startsWith('#code')) {
        return `?${location.hash}`.substring(0, 20);
    }
}

function getStartingParams() {
    const hash = getCurrentHash();
    if (hash) {
        return JSON.parse(window.sessionStorage.getItem(hash) || "[]");
    } else {
        return defaultParameters || [];
    }
}

function saveStartingParams(incoming, params) {
    const hash = getCurrentHash(incoming);
    window.sessionStorage.setItem(hash, JSON.stringify(params));
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
        window.ElectroDB.printMessage("error", e.message);
    }
    try {
        window.Prism.highlightAll();
    } catch (err) {
        console.log("err", err);
    }
}

function prepare(code) {
    code = code.replace(/import.*from .*/gi, "")
    code = code.replace(/Entity/g, "window.ElectroDB.Entity");
    code = code.replace(/Service/g, "window.ElectroDB.Service");
    return code;
}

(function load() {
    const parameters = getStartingParams();
    if (parameters.length === 0) {
        printEmpty();
    }
    for (const param of parameters) {
        window.ElectroDB.printToScreen({params: param.json, state: param.title});
    }
    window.Prism.highlightAll();
})();

window.onmessage = function(e) {
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
};