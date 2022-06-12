import { Handler } from "@netlify/functions";
import { errorPersister } from './store/errors';
import { postShareRef, putShareRef, getShareRef, GetShareRefOptions, PutRefOptions, PostRefOptions } from './store';

type Event = Parameters<Handler>[0];

const HEADERS = {
  IP_ADDRESS: "x-nf-client-connection-ip",
  USER_AGENT: "user-agent"
};

function formatResponse<T>(options?: {data?: T, message?: string, statusCode?: number}) {
  return {
    statusCode: options?.statusCode ?? 200,
    body: JSON.stringify({
      data: options?.data,
      message: options?.message ?? "thank you",
    })
  }
}

function getMetaData(event: Event): {ipAddress: string; userAgent: string} {
  return {
    ipAddress: event.headers[HEADERS.IP_ADDRESS] ?? "unknown",
    userAgent: event.headers[HEADERS.USER_AGENT] ?? "unknown",
  }
}

const VALIDATION_ERROR = "VALIDATION_ERROR";

class ValidationError extends Error {
  readonly type = VALIDATION_ERROR;
  readonly reason: string | undefined;
  constructor(reason: string, message?: string)  {
    super(message ?? reason);
    this.reason = reason;
  }
}

function isValidationError(err: any): err is ValidationError {
  return !!err && 'type' in err && err.type === VALIDATION_ERROR;
}

function getMissing(properties: {[key: string]: string | undefined}) {
  let missing: string[] = [];
  for (const key of Object.keys(properties)) {
    if (properties[key] === undefined) {
      missing.push(key);
    }
  }
  return missing;
}

type AllRequired<T extends {[key: string]: string | undefined}> = {[K in keyof T]: NonNullable<T[K]>};

function requiredProperties<T extends {[key: string]: string | undefined}, A extends {[key: string]: string | undefined}>(properties: T, add?: A): AllRequired<T> & A {
  const missing = getMissing(properties);
  if (missing.length) {
    throw new ValidationError(`Request missing properties ${missing.join(', ')}`);
  }
  return {
    ...properties,
    ...(add ?? {})
  } as AllRequired<T> & A;
}

function safeParseBody(event: Event) {
  return JSON.parse(event.body ?? "{}");
}

function parseGetShareRef(event: Event): GetShareRefOptions {
  const refId = event.queryStringParameters?.refId;
  return requiredProperties({refId});
}

function parsePostShareRef(event: Event): PostRefOptions {
  const { hash, writerId } = safeParseBody(event);
  const { ipAddress, userAgent } = getMetaData(event);
  return requiredProperties({hash, ipAddress, userAgent}, {writerId});
}

async function saveError(options: {err: any, body: string | null, httpMethod: string}) {
  console.log(options);
  const {err, body, httpMethod} = options;
  return errorPersister
    .create({
      error: err,
      body: body ?? '',
      method: httpMethod,
    })
    .go()
    .catch(console.log);
}

function parsePutShareRef(event: Event): PutRefOptions {
  const { hash, refId, writerId } = safeParseBody(event);
  const { ipAddress, userAgent } = getMetaData(event);
  console.log({ hash, refId, writerId, ipAddress, userAgent });
  return requiredProperties({
    hash, 
    refId, 
    writerId, 
    ipAddress, 
    userAgent
  });
}

const handler: Handler = async (event) => {
  try {
    console.log({event});
    const httpMethod = event.httpMethod.toLowerCase();
    switch(httpMethod) {
      case 'get':
        return formatResponse({
          data: await getShareRef(parseGetShareRef(event))
        });
      case 'post':
        return formatResponse({
          data: await postShareRef(parsePostShareRef(event))
        });
      case 'put':
        return formatResponse({
          data: await putShareRef(parsePutShareRef(event))
        })
      default: 
        return formatResponse({statusCode: 404});
    }
  } catch(err: any) {
    await saveError({
      err,
      body: event.body,
      httpMethod: event.httpMethod,
    });

    if (isValidationError(err)) {
      return formatResponse({message: err.reason, statusCode: 400});
    } else {
      return formatResponse({message: "internal error", statusCode: 500});
    }
  }
};

export { handler };


