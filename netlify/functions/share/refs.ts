import moment from "moment";
import { Entity } from 'electrodb';
import { table, client, serviceName } from './client';

function getDate() {
  return moment.utc().format("YYYY-MM-DD hh:mm:ss");
}

export const refWriter = new Entity({
  model: {
    entity: "ref_writer",
    version: "1",
    service: serviceName
  },
  attributes: {
    writerId: {
      type: "string"
    },
    userAgent: {
      type: "set",
      items: "string",
    },
    lastRef: {
      type: "string"
    },
    lastIpAddress: {
      type: "string",
    },
    createdAt: {
      type: "string",
      hidden: true,
      readOnly: true,
      default: () => getDate(),
      set: () => getDate(),
    },
    updatedAt: {
      watch: "*",
      type: "string",
      hidden: true,
      readOnly: true,
      default: () => getDate(),
      set: () => getDate()
    },
  },
  indexes: {
    record: {
      collection: "writer",
      pk: {
        field: "pk",
        composite: ["writerId"]
      },
      sk: {
        field: "sk",
        composite: []
      }
    }
  }
}, {table, client});

export const shareRef = new Entity({
  model: {
    entity: "share_ref",
    version: "1",
    service: serviceName
  },
  attributes: {
    refId: {
      type: "string",
    },
    writerId: {
      type: "string",
      readOnly: true,
    },
    hash: {
      type: "string",
    },
    updatedAt: {
      watch: "*",
      type: "string",
      hidden: true,
      set: () => getDate()
    },
    createdAt: {
      type: "string",
      hidden: true,
      readOnly: true,
      default: () => getDate(),
    },
  },
  indexes: {
    created: {
      collection: "writer",
      pk: {
        field: "pk",
        composite: ["writerId"]
      },
      sk: {
        field: "sk",
        composite: ["refId"]
      }
    },
    link: {
      index: "gsi1pk-gsi1sk-index",
      pk: {
        field: "gsi1pk",
        composite: ["refId"]
      },
      sk: {
        field: "gsi1sk",
        composite: []
      }
    }
  }
}, {table, client});