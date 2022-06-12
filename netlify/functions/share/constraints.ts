import { Entity } from 'electrodb';
import {table, client, serviceName} from './client';

export const uniqueConstraint = new Entity({
  model: {
    entity: "unique_contraint",
    version: "1",
    service: serviceName
  },
  attributes: {
    name: {
      type: "string"
    },
    value: {
      type: "string"
    }
  },
  indexes: {
    constraint: {
      pk: {
        field: "pk",
        composite: ["value"]
      },
      sk: {
        field: "sk",
        composite: ["name"]
      }
    }
  }
}, {table, client});