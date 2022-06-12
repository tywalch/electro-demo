import { Service, Entity } from 'electrodb';
import { client } from './client';

export type TransactItem = 
  { Put: any } 
  | { Update: any }
  | { ConditionCheck: any }
  | { Delete: any };

type PickMethods<S extends Service<any>, M extends keyof Entity<any, any, any, any>> = {
  [E in keyof S['entities']]: S['entities'][E] extends Entity<infer A, infer F, infer C, infer S>
    ? Pick<Entity<A,F,C,S>, M>
    : never;
}

export class Transaction<S extends Service<any>> {
  private readonly service: S;
  private readonly client: typeof client;
  private docParams: {
    TransactItems: TransactItem[];
  };
  
  constructor(options: { service: S }) {
    this.service = options.service;
    this.client = this.service.entities[Object.keys(this.service.entities)[0]].client;
    this.docParams = {
      TransactItems: []
    };
  }

  add(item: TransactItem) {
    this.docParams.TransactItems.push(
      item
    );
    return this;
  }

  put(fn: (entities: PickMethods<S, 'create' | 'put'>) => any) {
    this.docParams.TransactItems.push({
      Put: fn(this.service.entities)
    });
    return this;
  }

  update(fn: (entities: PickMethods<S, 'update' | 'patch'>) => any) {
    this.docParams.TransactItems.push({
      Update: fn(this.service.entities)
    });
    return this;
  }

  check(fn: (entities: PickMethods<S, 'get'>) => any) {
    this.docParams.TransactItems.push({
      ConditionCheck: fn(this.service.entities)
    });
    return this;
  }

  delete(fn: (entities: PickMethods<S, 'delete' | 'remove'>) => any) {
    this.docParams.TransactItems.push({
      Delete: fn(this.service.entities)
    });
    return this;
  }

  del(fn: (entities: PickMethods<S, 'delete' | 'remove'>) => any) {
    this.docParams.TransactItems.push({
      Delete: fn(this.service.entities)
    });
    return this;
  }

  go() {
    return this.client.transactWrite(this.docParams).promise();
  }

  params() {
    return this.docParams;
  }
}

type TransactionComposerFunction<S extends Service<any> = Service<any>, Params extends any[] = any[]> = (transaction: Transaction<S>, ...params: Params) => Transaction<S>;
type TransactionComposerFunctions<S extends Service<any> = Service<any>, Params extends any[] = any[]> = {
  readonly [key: string]: TransactionComposerFunction<S, Params>
}

type ComposedFunctions<S extends Service<any>, Params extends any[], F extends TransactionComposerFunctions<S, Params>> = {
  [name in keyof F]: F[name] extends TransactionComposerFunction<any, infer P>
    ? (...params: P) => ComposedFunctions<S, Params, F> & {go: () => Promise<any>, params: () => { TransactItems: TransactItem[] }}
    : never;
}

export function transactionComposer<S extends Service<any>, P extends any[], F extends TransactionComposerFunctions<S, P>>(service: S, functions: F): { begin: () => ComposedFunctions<S,P,F> } {
  return {
    begin: () => {
      const transaction = new Transaction({service});
      const obj = {} as any;

      for (const fn of Object.keys(functions)) {
        obj[fn] = (...args: P) => {
          functions[fn](transaction, ...args);
          return obj;
        }
      }
      
      obj['params'] = () => transaction.params();
      obj['go'] = () => transaction.go();

      return obj as ComposedFunctions<S,P,F>;
    }
  };
}