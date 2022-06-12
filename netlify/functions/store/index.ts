import { v4 as uuid } from "uuid";
import { Service } from 'electrodb';
import { createRateLimitter } from './ratelimit';
import { uniqueConstraint } from './constraints';
import { refWriter, shareRef } from './refs';
import { transactionComposer } from './transaction';
import { client, table } from './client';

const siteLimit = createRateLimitter({
  name: "site",
  interval: "hour",
  frequency: 200
});

const writerLimit = createRateLimitter({
  name: "writer",
  interval: "hour",
  frequency: 100
});

const anonLimit = createRateLimitter({
  name: "anon",
  interval: "hour",
  frequency: 50
});

const playground = new Service({
  uniqueConstraint,
  refWriter,
  shareRef,
}, {client, table});

type ShareRefResponse = {
  writerId?: string; 
  refId: string; 
  hash: string;
}

type RefOptions = {
  hash: string;
  refId: string;
  writerId: string;
}

type CreateWriterOptions = {
  writerId: string; 
  ipAddress: string; 
  refId: string;
  userAgent: string;
}

export type PutRefOptions = {
  hash: string;
  refId: string;
  writerId: string;
  userAgent: string; 
  ipAddress: string;
}

export type PostRefOptions = {
  hash: string; 
  userAgent: string; 
  ipAddress: string;
  writerId?: string; 
}

const transactions = transactionComposer(playground, {
  isUnique: (txn, options: { name: string, value: string }) => {
    return txn.put(s => s.uniqueConstraint.create(options).params());
  },
  siteLimit,
  anonLimit,
  writerLimit,
  patchShareRef: (txn, options: PutRefOptions) => {
    const { hash, ipAddress, writerId, refId } = options;
    return txn
      .update((s => s.shareRef
        .patch({ refId, writerId })
        .set({hash})
        .params())
      )
      .update(s => s.refWriter
        .patch({writerId})
        // .data((a, {add}) => add(a.userAgent, [userAgent]))
        .set({lastIpAddress: ipAddress})
        .params()
      )
  },
  createShareRef: (txn, options: RefOptions) => {
    const { writerId, hash, refId } = options;
    return txn.put(s => s.shareRef.create({writerId, hash, refId}).params())
  },
  createWriter: (txn, options: CreateWriterOptions) => {
    const {writerId, ipAddress, refId, userAgent} = options;
    return txn.put(s => s.refWriter.create({
      writerId, 
      lastIpAddress: ipAddress,
      lastRef: refId,
      userAgent: [userAgent],
    }).params());
  },
  patchWriter(txn, options: CreateWriterOptions) {
    const { writerId, ipAddress, refId } = options;
    return txn.update(s => s.refWriter
      .patch({writerId})
      .set({
        lastRef: refId,
        lastIpAddress: ipAddress
      })
      // .data((a, {add}) => add(a.userAgent, [userAgent]))
      .params()
    );
  },

});

function writerOwnsRef(options: {refId: string, writerId: string}) {
  const {refId, writerId} = options;
  return shareRef.query.link({ refId }).go()
    .then(refs => refs.every(r => r.writerId === writerId) && refs.length > 0);
}


export async function putShareRef(options: PutRefOptions): Promise<ShareRefResponse> {
  const { hash, userAgent, ipAddress, writerId } = options;
  const ownsRefId = await writerOwnsRef(options);
  const refId = ownsRefId ? options.refId : uuid();

  if (ownsRefId) {
    await transactions.begin()
      // .siteLimit()
      // .writerLimit({writerId})
      .patchShareRef({hash, ipAddress, refId, userAgent, writerId})
      .go();
  } else {
    await transactions.begin()
      // .siteLimit()
      // .writerLimit({writerId})
      .patchWriter({refId, writerId, ipAddress, userAgent})
      .createShareRef({hash, refId, writerId})
      .go();
  }

  return {
    hash,
    refId,
    writerId
  }
}

export async function postShareRef(options: PostRefOptions): Promise<ShareRefResponse> {
  const { hash, userAgent, ipAddress } = options;
  const isNewWriter = options.writerId === undefined;
  const writerId = options.writerId ?? uuid();
  const refId = uuid();

  if (isNewWriter) {
    await transactions.begin()
      // .siteLimit()
      .isUnique({name: "refId", value: refId})
      // .anonLimit({userAgent, ipAddress}) 
      .createWriter({userAgent, ipAddress, writerId, refId})
      .createShareRef({hash, refId, writerId})
      .go();

    return {
      writerId, 
      refId, 
      hash
    }
  } else {
    await transactions.begin()
      // .siteLimit()
      .isUnique({name: "refId", value: refId})
      // .writerLimit({writerId})
      .patchWriter({refId, writerId, ipAddress, userAgent})
      .createShareRef({hash, refId, writerId})
      .go();

    return {
      refId,
      hash
    }
  }
}

export type GetShareRefOptions = {
  refId: string;
}

export async function getShareRef({refId}: GetShareRefOptions): Promise<string|null> {
  const [ record ] = await playground.entities.shareRef.query.link({refId}).go();
  return record?.hash ?? null;
}
