import moment from 'moment';
import { v4 as uuid } from 'uuid';
import { Entity } from 'electrodb';
import { client, table, serviceName } from './client';

function getDate() {
  return moment.utc().format("YYYY-MM-DD hh:mm:ss");
}

export const errorPersister = new Entity({
  model: {
    entity: "error_persister",
    service: serviceName,
    version: "1"
  },
  attributes: {
    id: {
      type: 'string',
      readOnly: true,
      set: () => uuid(),
      default: () => uuid(),
    },
    createdAt: {
      type: "string",
      hidden: true,
      readOnly: true,
      default: () => getDate(),
      set: () => getDate(),
    },
    method: {
      type: 'string'
    },
    body: {
      type: 'string'
    },
    error: {
      type: 'any',
      set: (err: any) => JSON.stringify(err)
    }
  },
  indexes: {
    record: {
      pk: {
        field: "pk",
        composite: ["createdAt"]
      },
      sk: {
        field: 'sk',
        composite: ["id"]
      }
    }
  }
}, {table, client})