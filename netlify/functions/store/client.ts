import {DynamoDB} from "aws-sdk";
function getEnv(env: string, fallback?: undefined): string | undefined
function getEnv(env: string, fallback: string): string
function getEnv(env: string, fallback: any) {
  const value = process.env[env];
  if (value) {
      return value
  } else if (fallback) {
    return fallback;
  }
  console.log(`Missing Environment Variable, ${env}`);
};

export const table = getEnv("DYNAMODB_TABLE", "tinkertamper");

export const serviceName = "electrodb_playground";

const accessKeyId = getEnv("DYNAMODB_ACCESS_KEY") as string;
const secretAccessKey = getEnv("DYNAMODB_SECRET") as string;

let config: any;
if (accessKeyId && secretAccessKey) {
  config = {
    region: "us-east-1",
    credentials: { accessKeyId, secretAccessKey },
  }
} else {
  config = {
    region: "us-east-1",
    endpoint: getEnv("DYNAMODB_ENDPOINT")
  }
}

export const client = new DynamoDB.DocumentClient(config);

