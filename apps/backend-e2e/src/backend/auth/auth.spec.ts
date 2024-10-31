import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from '../../../../backend/src/app/auth/auth.service';
import { AuthController } from '../../../../backend/src/app/auth/auth.controller';
import { getMockAuthGuard, mockAuthConfig } from '../../mocks/auth.mocks';
import { GoogleOauthGuard } from '../../../../backend/src/app/auth/guards/google-oauth.guard';
import { PrismaService } from '../../../../backend/src/app/database/prisma.service';

describe('Auth paths test', () => {
  let app: INestApplication;

  beforeAll(async () => {
    let authService = {
      signInUser: (_user: unknown) => 'access_token',
    };
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [mockAuthConfig],
        }),
      ],
      providers: [AuthService, ConfigService, GoogleOauthGuard],
      controllers: [AuthController],
    })
      .overrideProvider(AuthService)
      .useValue(authService)
      .overrideGuard(GoogleOauthGuard)
      .useValue(getMockAuthGuard(true))
      .overrideProvider(PrismaService)
      .useValue(null)
      .compile();
    app = moduleRef.createNestApplication();

    app.setGlobalPrefix('api');
    app = await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('/GET google should redirect', async () => {
    return await request(app.getHttpServer())
      .get('/api/auth/google')
      .expect(200);
  });

  it('/GET google/cb should set access token cookie', async () => {
    const expectedSetCookieHeaderValues = [
      'access_token=access_token',
      'Max-Age=86400',
      'Path=/',
    ];
    return await request(app.getHttpServer())
      .get('/api/auth/google/cb')
      .expect(302)
      .expect(response => {
        const resultSetCookieHeaderValues = response.headers['set-cookie']
          .at(0)
          .split(';')
          .splice(0, 3)
          .map(value => value.trim());
        expect(resultSetCookieHeaderValues).toEqual(
          expectedSetCookieHeaderValues
        );
      });
  });
});
