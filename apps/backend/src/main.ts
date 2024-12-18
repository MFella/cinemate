/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import { ConfigService } from '@nestjs/config';
import { MoviesService } from './app/movies/movies.service';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(cookieParser());

  app.set('trust proxy', true);
  const configService = app.get<ConfigService>(ConfigService);
  const appPort = configService.get<number>('port');
  const globalPrefix = 'api';

  app.setGlobalPrefix(globalPrefix);
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, disableErrorMessages: true })
  );
  app.enableCors({
    origin: [configService.get<string>('frontendUrl')],
    credentials: true,
  });
  await app.listen(appPort);
  const moviesService = app.get<MoviesService>(MoviesService);
  await moviesService.fetchAndSaveGenres();
  Logger.log(
    `🚀 Application is running on: http://localhost:${appPort}/${globalPrefix}`
  );
}

bootstrap();
