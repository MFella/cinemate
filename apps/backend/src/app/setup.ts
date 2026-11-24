import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

export const GLOBAL_PREFIX = 'api';

/** Settings shared by the long-running server (main.ts) and the Lambda handler. */
export function configureApp(app: NestExpressApplication): void {
  app.use(cookieParser());
  app.set('trust proxy', true);
  app.setGlobalPrefix(GLOBAL_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, disableErrorMessages: true })
  );
  app.enableCors({
    origin: [app.get(ConfigService).get<string>('frontendUrl')],
    credentials: true,
  });
}
