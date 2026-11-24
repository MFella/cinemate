/**
 * Long-running server (local development). The AWS entry point is lambda.ts.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import { ConfigService } from '@nestjs/config';
import { MoviesService } from './app/movies/movies.service';
import { NestExpressApplication } from '@nestjs/platform-express';
import { configureApp, GLOBAL_PREFIX } from './app/setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);

  const appPort = app.get<ConfigService>(ConfigService).get<number>('port');
  await app.listen(appPort);
  await app.get<MoviesService>(MoviesService).fetchAndSaveGenres();
  Logger.log(
    `🚀 Application is running on: http://localhost:${appPort}/${GLOBAL_PREFIX}`
  );
}

bootstrap();
