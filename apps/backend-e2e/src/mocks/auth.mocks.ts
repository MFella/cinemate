import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { NextFunction } from 'express';

export const getMockAuthGuard = (isAuthorized: boolean) => {
  return {
    canActivate: jest.fn(() => isAuthorized),
  };
};

export const mockAuthConfig = () => ({
  oauthGoogleConfig: {
    clientId: 'client-id',
    clientSecret: '',
    callbackUrl: '/',
    scope: 'local',
  },
});

export const createTestApp = (
  testingModule: TestingModule
): INestApplication<any> => {
  const app = testingModule.createNestApplication();
  app.setGlobalPrefix('api');
  app.use(async (request, _response, next: NextFunction) => {
    request.user = {
      id: 'id',
    };

    next();
  });

  return app;
};
