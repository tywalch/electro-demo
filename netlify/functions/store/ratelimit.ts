import moment from "moment";
import { Entity } from 'electrodb';
import { Transaction } from './transaction';
import { table, client, serviceName } from './client';

type RateLimitterOptions = {
  name: string;
  frequency: number; 
  interval: "minute" | "hour"; 
}

function createDateInterval(frequency: number, interval: "minute" | "hour") {
  const unit = interval === "hour" ? "minute" : "second";
  const occurances = Math.ceil(60 / frequency);
  const date = moment.utc();
  const nearest = getNearest(date[unit](), occurances);
  date.set(unit, nearest);
  return date.format("YYYY-MM-DD hh:mm:ss");
}

function getNearest(num: number, nearest: number) {
  return Math.round(num / nearest) * nearest;
}

export function createRateLimitId(identifiers: {[key: string]: string|number|boolean}) {
  return JSON.stringify(Object.keys(identifiers).sort().map(key => [key, identifiers[key]]));
}

export type RateLimitterEntity = ReturnType<typeof createRateLimitter>;

export function createRateLimitter(options: RateLimitterOptions) {
  const {name, frequency, interval} = options;
  const entity = new Entity({
    model: {
      entity: `${name}_ratelimitter`,
      service: serviceName,
      version: "1"
    }, 
    attributes: {
      id: {
        type: "string",
      },
      interval: {
        type: "string",
        default: () => createDateInterval(frequency, interval),
      },
      count: {
        type: "number"
      }
    },
    indexes: {
      limits: {
        pk: {
          field: "pk",
          composite: ["id"]
        },
        sk: {
          field: "sk",
          composite: ["interval"]
        }
      }
    }
  }, {table, client});

  return (txn: Transaction<any>, identifiers: {[key: string]: string|number|boolean} = {name}) => {
    const params = entity
      .update({
        id: createRateLimitId(identifiers), 
        interval: createDateInterval(frequency, interval)
      })
      .add({count: 1})
      .where(({count}, {lt}) => lt(count, frequency))
      .params() as any;

    return txn.add({Update: params});
  }
}
