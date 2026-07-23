export const initialCode = `/* Model queries, see results, share with friends */

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
        validate: /[0-9]{4}-[0-9]{2}-[0-9]{2}/,
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
      members: {
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
      user: {
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
  .where(({title}, {contains}) => contains(title, "database"))
  .go({order: 'desc'});

// use a collection to query more than one entity at a time
app.collections
  .assignments({ user })
  .where(({ points }, { notExists, between }) => \`
    \${notExists(points)} OR \${between(points, 1, 5)}
  \`)
  .go({pages: 'all'});

// \`create\` is like \`put\` except it uses "attribute_not_exists"
// to ensure you do not overwrite a record that already exists
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
