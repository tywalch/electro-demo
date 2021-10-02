const initialCode = `/* Model queries, see results, share with friends */

import { Entity, Service } from "electrodb";

const table = "your_table_name";

/* Tasks Entity */
const tasks = new Entity(
  {
    model: {
      entity: "tasks",
      version: "1",
      service: "taskapp"
    },
    attributes: {
      team: {
        type: "string",
        required: true
      },
      task: {
        type: "string",
        required: true
      },
      project: {
        type: "string",
        required: true
      },
      user: {
        type: "string",
        required: true
      },
      title: {
        type: "string",
        required: true,
      },
      // lowercased version of title for user search
      titleLowerCase: {
        type: "string",
        // trigger when title is put/updated
        watch: ["title"],
        // hidden so it is not returned to the user
        hidden: true,
        set: (_, {title}) => {
          if (typeof title === "string") {
            return title.toLowerCase();
          }
          // returning undefined skips value from update
          return undefined;
        }
      },
      description: {
        type: "string"
      },
      status: {
        // use an array to type an enum
        type: ["open", "in-progress", "on-hold", "closed"] as const,
        default: "open"
      },
      points: {
        type: "number",
      },
      tags: {
        type: "set",
        items: "string"
      },
      comments: {
        type: "list",
        items: {
          type: "map",
          properties: {
            user: {
              type: "string"
            },
            body: {
              type: "string"
            }
          }
        }
      },
      closed: {
        type: "string",
        // watch for changes to status
        watch: ["status"],
        readOnly: true,
        set: (_, {status}) => {
          // return YYYY-MM-DD if status is closed
          if (status === "closed") {
            const d = new Date();
            return [
              d.getFullYear(),
              ('0' + (d.getMonth() + 1)).slice(-2),
              ('0' + d.getDate()).slice(-2)
            ].join('-');
          } else {
            return "";
          }
        },
      },
      createdAt: {
        type: "number",
        default: () => Date.now(),
        // cannot be modified after created
        readOnly: true
      },
      updatedAt: {
        type: "number",
        // watch for changes to any attribute
        watch: "*",
        // set current timestamp when updated
        set: () => Date.now(),
        readOnly: true
      }
    },
    indexes: {
      projects: {
        pk: {
          field: "pk",
          composite: ["team"]
        },
        sk: {
          field: "sk",
          // create composite keys for partial sort key queries
          composite: ["project", "task"]
        }
      },
      assigned: {
        // collections allow for queries across multiple entities
        collection: "assignments",
        index: "gsi1pk-gsi1sk-index",
        pk: {
          // map to your GSI Hash/Partition key
          field: "gsi1pk",
          composite: ["user"]
        },
        sk: {
          // map to your GSI Range/Sort key
          field: "gsi1sk",
          composite: ["status"]
        }
      },
      backlog: {
        // map to the GSI name on your DynamoDB table
        index: "gsi2pk-gsi2sk-index",
        pk: {
          field: "gsi2pk",
          composite: ["project"]
        },
        sk: {
          field: "gsi2sk",
          composite: ["team", "closed"],
        }
      }
    }
  },
  { table }
);

/* Users Entity */
const users = new Entity(
  {
    model: {
      entity: "user",
      service: "taskapp",
      version: "1"
    },
    attributes: {
      team: {
        type: "string"
      },
      user: {
        type: "string"
      },
      role: {
        type: ["dev", "senior", "staff", "principal"] as const,
        set: (title: string) => {
          // save as index for comparison
          return [
            "dev",
            "senior",
            "staff",
            "principal"
          ].indexOf(title);
        },
        get: (index: number) => {
          return [
            "dev",
            "senior",
            "staff",
            "principal"
          ][index] || "other";
        }
      },
      manager: {
        type: "string",
      },
      firstName: {
        type: "string"
      },
      lastName: {
        type: "string"
      },
      fullName: {
        type: "string",
        // never set value to the database
        set: () => undefined,
        // calculate full name on retrieval
        get: (_, {firstName, lastName}) => {
          return \`\${firstName ?? ""} \${lastName ?? ""}\`.trim();
        }
      },
      profile: {
        type: "map",
        properties: {
          photo: {
            type: "string"
          },
          bio: {
            type: "string"
          },
          location: {
            type: "string"
          }
        }
      },
      pinned: {
        type: "any"
      },
      following: {
        type: "set",
        items: "string"
      },
      followers: {
        type: "set",
        items: "string"
      },
      createdAt: {
        type: "number",
        default: () => Date.now(),
        readOnly: true
      },
      updatedAt: {
        type: "number",
        watch: "*",
        set: () => Date.now(),
        readOnly: true
      }
    },
    indexes: {
      users: {
        collection: "organization",
        pk: {
          composite: ["team"],
          field: "pk"
        },
        sk: {
          composite: ["user"],
          field: "sk"
        }
      },
      lookup: {
        collection: "assignments",
        index: "gsi1pk-gsi1sk-index",
        pk: {
          composite: ["user"],
          field: "gsi1pk"
        },
        sk: {
          field: "gsi1sk",
          composite: []
        }
      }
    }
  },
  { table }
);

const app = new Service({ users, tasks });

/* Write queries to generate parameters on the right */

const team = "green";
const user = "d.huynh";
const project = "core";
const task = "45-6620";

// complex objects are supported and typed in ElectroDB
const comment = {
  user: "janet",
  body: "This seems half-baked."
};

// add a comment, tag, and update item's status with a condition
tasks
  .patch({ task, project, team })
  .set({ status: "on-hold" })
  .add({ tags: ["half-baked"] })
  .append({ comments: [comment] })
  .where(( {status}, {eq} ) => eq(status, "in-progress"))
  .go();

const january = "2021-01";
const july = "2021-07";

// sort key query conditions are first class in ElectroDB
tasks.query
  .backlog({ project })
  .between(
    { team, closed: january },
    { team, closed: july },
  )
  .where(({titleLowerCase}, {contains}) => contains(titleLowerCase, "database"))
  .go();

// use a collection to query more than one entity at a time
app.collections
  .assignments({ user })
  .where(({ points }, { notExists, between }) => \`
    \${notExists(points)} OR \${between(points, 1, 5)}
  \`)
  .go();

// \`create\` is like \`put\` except it uses "attribute_not_exists"
users.create({
  team: "purple",
  user: "t.walch",
  role: "senior",
  lastName: "walch",
  firstName: "tyler",
  manager: "d.purdy",
  profile: {
    bio: "makes things",
    photo: "selfie.jpg",
    location: "atlanta"
  },
  // interact with DynamoDB sets like arrays
  following: ["d.purdy"]
}).go();`;

const theme = {
    base: 'vs-dark',
    // base: "hc-black",
    inherit: true,
    colors: {
        "focusBorder": "#388bfd",
        "foreground": "#c9d1d9",
        "descriptionForeground": "#8b949e",
        "errorForeground": "#f85149",
        "editor.foreground": "#c9d1d9",
        "editor.background": "#0d1117",
        // "editor.background": "#1a212a",
        // "scrollbar.shadow": "#0008",
        "scrollbar.shadow": "#0d1117",
        "scrollbarSlider.background": "#484F5833",
        "scrollbarSlider.hoverBackground": "#484F5844",
        "scrollbarSlider.activeBackground": "#484F5888",
        "editorOverviewRuler.border": "#0d1117",
    },
    rules: [
        {
            "token": "type",
            // "foreground": "3DC9B0"
            "foreground": "#4781b7",
            "fontStyle": "bold"
        },
        { token: 'number', foreground: "#ffc107" },
        { token: 'regexp', foreground: "#ffc107" },
        { token: 'boolean', foreground: "#ffc107" },
        {
            "foreground": "#8b949e",
            "token": "comment"
        },
        {
            "foreground": "#8b949e",
            "token": "punctuation.definition.comment"
        },
        {
            "foreground": "#8b949e",
            "token": "string.comment"
        },
        {
            "foreground": "#79c0ff",
            "token": "constant"
        },
        {
            "foreground": "#79c0ff",
            "token": "entity.name.constant"
        },
        {
            "foreground": "#79c0ff",
            "token": "variable.other.constant"
        },
        {
            "foreground": "#79c0ff",
            "token": "variable.language"
        },
        {
            "foreground": "#79c0ff",
            "token": "entity"
        },
        {
            "foreground": "#ffa657",
            "token": "entity.name"
        },
        {
            "foreground": "#ffa657",
            "token": "meta.export.default"
        },
        {
            "foreground": "#ffa657",
            "token": "meta.definition.variable"
        },
        {
            // "foreground": "#c9d1d9",
            "foreground": "#ffc107",
            "token": "variable.parameter.function"
        },
        { "token": "variable.parameter", "foreground": "#f08d39" },
        { "token": "parameter.variable", "foreground": "#f08d39" },
        { "token": "meta.function.parameter variable", "foreground": "#f08d39" },
        {
            "foreground": "#c9d1d9",
            "token": "meta.jsx.children"
        },
        {
            "foreground": "#c9d1d9",
            "token": "meta.block"
        },
        {
            "foreground": "#c9d1d9",
            "token": "meta.tag.attributes"
        },
        {
            "foreground": "#c9d1d9",
            "token": "entity.name.constant"
        },
        {
            "foreground": "#c9d1d9",
            "token": "meta.object.member"
        },
        {
            "foreground": "#c9d1d9",
            "token": "meta.embedded.expression"
        },
        {
            "foreground": "#d2a8ff",
            "token": "entity.name.function"
        },
        {
            "foreground": "#7ee787",
            "token": "entity.name.tag"
        },
        {
            "foreground": "#7ee787",
            "token": "support.class.component"
        },
        {
            // "foreground": "#ff7b72",
            // "foreground": "#4781b7",
            "foreground": "#ffc107",
            "token": "keyword"
        },
        {
            // "foreground": "#ff7b72",
            "foreground": "#4781b7",
            "token": "storage"
        },
        {
            // "foreground": "#ff7b72",
            "foreground": "#4781b7",
            "token": "storage.type"
        },
        {
            "foreground": "#c9d1d9",
            "token": "storage.modifier.package"
        },
        {
            "foreground": "#c9d1d9",
            "token": "storage.modifier.import"
        },
        {
            "foreground": "#c9d1d9",
            "token": "storage.type.java"
        },
        {
            "foreground": "#79c0ff",
            "token": "string"
        },
        {
            "foreground": "#79c0ff",
            "token": "punctuation.definition.string"
        },
        {
            "foreground": "#79c0ff",
            "token": "string punctuation.section.embedded source"
        },
        {
            "foreground": "#79c0ff",
            "token": "support"
        },
        {
            "foreground": "#79c0ff",
            "token": "meta.property-name"
        },
        {
            "foreground": "#ffa657",
            "token": "variable"
        },
        {
            "foreground": "#c9d1d9",
            "token": "variable.other"
        },
        {
            "fontStyle": "italic",
            "foreground": "#ffa198",
            "token": "invalid.broken"
        },
        {
            "fontStyle": "italic",
            "foreground": "#ffa198",
            "token": "invalid.deprecated"
        },
        {
            "fontStyle": "italic",
            "foreground": "#ffa198",
            "token": "invalid.illegal"
        },
        {
            "fontStyle": "italic",
            "foreground": "#ffa198",
            "token": "invalid.unimplemented"
        },
        {
            "fontStyle": "italic underline",
            "background": "#ff7b72",
            // "background": "#ffc107",
            "foreground": "#0d1117",
            "content": "^M",
            "token": "carriage-return"
        },
        {
            "foreground": "#ffa198",
            "token": "message.error"
        },
        {
            "foreground": "#c9d1d9",
            "token": "string source"
        },
        {
            "foreground": "#79c0ff",
            "token": "string variable"
        },
        {
            "foreground": "#79c0ff",
            "token": "source.regexp"
        },
        {
            "foreground": "#79c0ff",
            "token": "string.regexp"
        },
        {
            "foreground": "#79c0ff",
            "token": "string.regexp.character-class"
        },
        {
            "foreground": "#79c0ff",
            "token": "string.regexp constant.character.escape"
        },
        {
            "foreground": "#79c0ff",
            "token": "string.regexp source.ruby.embedded"
        },
        {
            "foreground": "#79c0ff",
            "token": "string.regexp string.regexp.arbitrary-repitition"
        },
        {
            "fontStyle": "bold",
            "foreground": "#7ee787",
            "token": "string.regexp constant.character.escape"
        },
        {
            "foreground": "#79c0ff",
            "token": "support.constant"
        },
        {
            "foreground": "#79c0ff",
            "token": "support.variable"
        },
        {
            "foreground": "#79c0ff",
            "token": "meta.module-reference"
        },
        {
            "foreground": "#ffa657",
            "token": "punctuation.definition.list.begin.markdown"
        },
        {
            "fontStyle": "bold",
            "foreground": "#79c0ff",
            "token": "markup.heading"
        },
        {
            "fontStyle": "bold",
            "foreground": "#79c0ff",
            "token": "markup.heading entity.name"
        },
        {
            "foreground": "#7ee787",
            "token": "markup.quote"
        },
        {
            "fontStyle": "italic",
            "foreground": "#c9d1d9",
            "token": "markup.italic"
        },
        {
            "fontStyle": "bold",
            "foreground": "#c9d1d9",
            "token": "markup.bold"
        },
        {
            "foreground": "#79c0ff",
            "token": "markup.raw"
        },
        {
            "background": "#490202",
            "foreground": "#ffa198",
            "token": "markup.deleted"
        },
        {
            "background": "#490202",
            "foreground": "#ffa198",
            "token": "meta.diff.header.from-file"
        },
        {
            "background": "#490202",
            "foreground": "#ffa198",
            "token": "punctuation.definition.deleted"
        },
        {
            "background": "#04260f",
            "foreground": "#7ee787",
            "token": "markup.inserted"
        },
        {
            "background": "#04260f",
            "foreground": "#7ee787",
            "token": "meta.diff.header.to-file"
        },
        {
            "background": "#04260f",
            "foreground": "#7ee787",
            "token": "punctuation.definition.inserted"
        },
        {
            "background": "#5a1e02",
            "foreground": "#ffa657",
            "token": "markup.changed"
        },
        {
            "background": "#5a1e02",
            "foreground": "#ffa657",
            "token": "punctuation.definition.changed"
        },
        {
            "foreground": "#161b22",
            "background": "#79c0ff",
            "token": "markup.ignored"
        },
        {
            "foreground": "#161b22",
            "background": "#79c0ff",
            "token": "markup.untracked"
        },
        {
            "foreground": "#d2a8ff",
            "fontStyle": "bold",
            "token": "meta.diff.range"
        },
        {
            "foreground": "#79c0ff",
            "token": "meta.diff.header"
        },
        {
            "fontStyle": "bold",
            "foreground": "#79c0ff",
            "token": "meta.separator"
        },
        {
            "foreground": "#79c0ff",
            "token": "meta.output"
        },
        {
            "foreground": "#8b949e",
            "token": "brackethighlighter.tag"
        },
        {
            "foreground": "#8b949e",
            "token": "brackethighlighter.curly"
        },
        {
            "foreground": "#8b949e",
            "token": "brackethighlighter.round"
        },
        {
            "foreground": "#8b949e",
            "token": "brackethighlighter.square"
        },
        {
            "foreground": "#8b949e",
            "token": "brackethighlighter.angle"
        },
        {
            "foreground": "#8b949e",
            "token": "brackethighlighter.quote"
        },
        {
            "foreground": "#ffa198",
            "token": "brackethighlighter.unmatched"
        },
        {
            "foreground": "#79c0ff",
            "fontStyle": "underline",
            "token": "constant.other.reference.link"
        },
        {
            "foreground": "#79c0ff",
            "fontStyle": "underline",
            "token": "string.other.link"
        }
    ]
};

function getInitialText() {
    return location.hash.startsWith('#code')
        ? undefined
        : initialCode;
}

function sendChanges(sandbox, code) {
    const query = sandbox.createURLQueryWithCompilerOptions(sandbox);
    window.top.postMessage(JSON.stringify({type: "code", data: {code, query}}), '*');
}

function sendSharable(sandbox) {
    const query = sandbox.createURLQueryWithCompilerOptions(sandbox);
    window.top.postMessage(JSON.stringify({type: "query", data: query}), '*');
}

function sendError(error) {
    let data;
    if (error instanceof Error) {
        data = error.message
    } else if (typeof error === "string") {
        data = error;
    } else {
        data = JSON.stringify(error, null, 4);
    }
    window.top.postMessage(JSON.stringify({type: "error", data: data}), '*');
}

function debounce(func, timeout = 300){
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, timeout);
    };
}

function processCode(sandbox) {
    sandbox.getRunnableJS()
        .then((js) => {
            sendChanges(sandbox, js);
            sendSharable(sandbox);
        })
        .catch(err => {
            sendError(err);
        })
}

const onCodeUpdate = debounce((sandbox) => processCode(sandbox), 400);

function setup(main, _tsWorker, sandboxFactory) {
    const isOK = main && window.ts && sandboxFactory
    if (isOK) {
        document.getElementById("editor").style.opacity = 100;
    } else {
        console.error('Could not get all the dependencies of sandbox set up!');
        console.error('main', !!main, 'ts', !!window.ts, 'sandbox', !!sandbox);
        return;
    }

    const config = {
        text: getInitialText(),
        compilerOptions: {
            strict: true,
            noImplicitAny: true
        },
        domID: 'editor',
        automaticLayout: true,
        monacoSettings: {
            theme: 'electrodb',
            fontSize: 14,
            fontFamily: 'JetBrains Mono, monospace',
        }
    }

    main.editor.defineTheme("electrodb", theme);
    const sandbox = sandboxFactory.createTypeScriptSandbox(config, main, window.ts);
    sandbox.languageServiceDefaults.addExtraLib('./electrodb.d.ts');
    processCode(sandbox);
    sandbox.editor.onDidChangeModelContent(() => onCodeUpdate(sandbox));
    sandbox.editor.onDidBlurEditorText(() => onCodeUpdate(sandbox));
    sandbox.editor.focus();
}

(function load() {
    document.getElementById("editor").style.height = window.innerHeight + "px";
    // First set up the VSCode loader in a script tag
    const getLoaderScript = document.createElement('script')
    getLoaderScript.src = 'https://www.typescriptlang.org/js/vs.loader.js'
    getLoaderScript.async = true
    getLoaderScript.onload = () => {
        require.config({
            paths: {
                vs: 'https://typescript.azureedge.net/cdn/4.0.5/monaco/min/vs',
                // vs: 'https://unpkg.com/@typescript-deploys/monaco-editor@4.0.5/min/vs',
                sandbox: 'https://www.typescriptlang.org/js/sandbox',
            },
            ignoreDuplicateModules: ['vs/editor/editor.main'],
        })
        require(['vs/editor/editor.main', 'vs/language/typescript/tsWorker', 'sandbox/index'], setup);
    }
    document.body.appendChild(getLoaderScript);
})();

