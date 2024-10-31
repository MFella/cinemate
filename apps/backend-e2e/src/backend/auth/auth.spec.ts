import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AuthModule } from '../../../../backend/src/app/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from 'backend/auth/auth.service';
import { AuthController } from 'backend/auth/auth.controller';
import { mockAuthConfig } from '../../mocks/auth.mocks';

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
        AuthModule,
      ],
      providers: [AuthService, ConfigService],
      controllers: [AuthController],
    })
      .overrideProvider(AuthService)
      .useValue(authService)
      .compile();
    app = moduleRef.createNestApplication();

    app.setGlobalPrefix('api');
    app = await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('/GET google should redirect', async () => {
    const expectedRedirectUrl =
      'https://accounts.google.com/o/oauth2/v2/auth?response_type=code&scope=local&client_id=client-id';
    await request(app.getHttpServer())
      .get('/api/auth/google')
      .expect(302)
      .expect('location', expectedRedirectUrl);
  });
});
