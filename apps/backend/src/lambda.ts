/**
 * AWS Lambda entry point (API Gateway HTTP API, payload format 2.0).
 *
 * The Nest app is created once per cold start and reused by the warm invocations.
 * Secrets are read from Secrets Manager before the app starts, so the configuration
 * code keeps reading `process.env` exactly as it does locally.
 */

import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import serverlessExpress from '@codegenie/serverless-express';
import type { Handler } from 'aws-lambda';

import { configureApp } from './app/setup';

let cachedHandler: Handler | undefined;

/** The secret is a JSON object `{ "DATABASE_URL": "...", ... }` copied into `process.env`. */
export async function loadSecrets(
  secretId: string | undefined,
  client = new SecretsManagerClient({})
): Promise<void> {
  if (!secretId) {
    return;
  }

  const { SecretString } = await client.send(
    new GetSecretValueCommand({ SecretId: secretId })
  );
  for (const [key, value] of Object.entries(
    JSON.parse(SecretString ?? '{}') as Record<string, string>
  )) {
    process.env[key] ??= value;
  }
}

async function bootstrap(): Promise<Handler> {
  await loadSecrets(process.env.BACKEND_SECRET_ID);

  // imported only now: ConfigModule.forRoot() reads process.env while the module loads
  const { AppModule } = await import('./app/app.module');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  configureApp(app);
  await app.init();

  return serverlessExpress({ app: app.getHttpAdapter().getInstance() });
}

export const handler: Handler = async (event, context, callback) => {
  cachedHandler ??= await bootstrap();
  return cachedHandler(event, context, callback);
};
