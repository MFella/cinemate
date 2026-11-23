import { UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthController } from '../app/auth/auth.controller';
import { AuthService } from '../app/auth/auth.service';
import { AuthGuard } from '../app/_guards/auth.guard';
import { CognitoService } from '../app/auth/cognito/cognito.service';
import { CognitoIdentity } from '../app/auth/cognito/cognito-identity';
import { UserService } from '../app/user/user.service';
import { PrismaService } from '../app/database/prisma.service';
import { SessionService } from '../app/auth/session.service';
import { DemoService } from '../app/demo/demo.service';
import { DemoTokenService } from '../app/demo/demo-token.service';

const IDENTITY: CognitoIdentity = {
  id: '110248495921238986420',
  provider: 'google',
  email: 'anna@example.com',
  picture: 'https://example.com/anna.jpg',
};

const createCognito = (overrides: Partial<CognitoService> = {}) =>
  ({
    getAuthorizeUrl: jest.fn(
      (provider: string, state: string) =>
        `https://hosted/ui?p=${provider}&s=${state}`
    ),
    getLogoutUrl: jest.fn(() => 'https://hosted/logout'),
    exchangeCodeForIdToken: jest.fn().mockResolvedValue('id-token'),
    verifyIdToken: jest.fn().mockResolvedValue(IDENTITY),
    ...overrides,
  }) as unknown as jest.Mocked<CognitoService>;

const demoServiceStub = (isEnabled = false) =>
  ({
    isEnabled,
    ensureFresh: jest.fn(),
  }) as unknown as jest.Mocked<DemoService>;

const createTokens = () =>
  new DemoTokenService({ get: () => ({ tokenSecret: 'test' }) } as never);

const createSession = (cognito: CognitoService) =>
  new SessionService(cognito, createTokens(), demoServiceStub());

const createResponse = () => {
  const response = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    redirect: jest.fn(),
    status: jest.fn(),
  };
  response.status.mockReturnValue(response);
  // the controller only uses cookie/clearCookie/redirect
  return response as typeof response & Response;
};

describe('AuthGuard', () => {
  const run = async (
    cognito: CognitoService,
    cookies?: Record<string, string>
  ) => {
    const request: Record<string, unknown> = { cookies };
    const guard = new AuthGuard(createSession(cognito));
    const result = await guard.canActivate({
      switchToHttp: () => ({ getRequest: () => request }),
    } as never);
    return { result, request };
  };

  it('rejects a request without the cookie', async () => {
    await expect(run(createCognito(), {})).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('rejects a token that does not verify', async () => {
    const cognito = createCognito({
      verifyIdToken: jest.fn().mockRejectedValue(new UnauthorizedException()),
    });

    await expect(run(cognito, { access_token: 'forged' })).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('lets a valid token in and exposes the user to controllers', async () => {
    const { result, request } = await run(createCognito(), {
      access_token: 'id-token',
    });

    expect(result).toBe(true);
    expect(request['user']).toEqual({
      sub: IDENTITY.id,
      email: IDENTITY.email,
      picture: IDENTITY.picture,
    });
  });
});

describe('AuthController', () => {
  const FRONTEND = 'http://localhost:4200';

  const build = (cognito = createCognito()) => {
    const authService = {
      signInUser: jest.fn().mockResolvedValue({ id: IDENTITY.id }),
    } as unknown as jest.Mocked<AuthService>;
    const configService = {
      get: (key: string) => ({ isDevMode: true, frontendUrl: FRONTEND })[key],
    } as unknown as ConfigService;
    return {
      cognito,
      authService,
      controller: new AuthController(
        authService,
        configService,
        cognito,
        createSession(cognito),
        demoServiceStub(),
        createTokens()
      ),
    };
  };

  describe('login', () => {
    it('remembers a random state in a cookie and redirects to the hosted UI', () => {
      const { controller, cognito } = build();
      const response = createResponse();

      controller.login('google', response);

      const [, state, options] = response.cookie.mock.calls[0];
      expect(response.cookie.mock.calls[0][0]).toBe('oauth_state');
      expect(state).toEqual(expect.any(String));
      expect(state.length).toBeGreaterThanOrEqual(16);
      expect(options).toEqual(
        expect.objectContaining({ httpOnly: true, sameSite: 'lax' })
      );
      expect(cognito.getAuthorizeUrl).toHaveBeenCalledWith('google', state);
      expect(response.redirect).toHaveBeenCalledWith(
        `https://hosted/ui?p=google&s=${state}`
      );
    });

    it('uses a different state each time', () => {
      const { controller } = build();
      const first = createResponse();
      const second = createResponse();

      controller.login('google', first);
      controller.login('google', second);

      expect(first.cookie.mock.calls[0][1]).not.toBe(
        second.cookie.mock.calls[0][1]
      );
    });
  });

  describe('callback', () => {
    const request = (state = 'abc', cookieState: string | null = 'abc') =>
      ({ cookies: cookieState ? { oauth_state: cookieState } : {} }) as never;

    it('signs the user in and stores the ID token in the access cookie', async () => {
      const { controller, cognito, authService } = build();
      const response = createResponse();

      await controller.callback('the-code', 'abc', request(), response);

      expect(cognito.exchangeCodeForIdToken).toHaveBeenCalledWith('the-code');
      expect(cognito.verifyIdToken).toHaveBeenCalledWith('id-token');
      expect(authService.signInUser).toHaveBeenCalledWith(IDENTITY);
      expect(response.cookie).toHaveBeenCalledWith(
        'access_token',
        'id-token',
        expect.objectContaining({ httpOnly: true })
      );
      expect(response.clearCookie).toHaveBeenCalledWith('oauth_state');
      expect(response.redirect).toHaveBeenCalledWith(`${FRONTEND}/match`);
    });

    it('rejects a state that differs from the one in the cookie (CSRF)', async () => {
      const { controller, cognito } = build();

      await expect(
        controller.callback(
          'code',
          'evil',
          request('evil', 'abc'),
          createResponse()
        )
      ).rejects.toThrow(UnauthorizedException);
      expect(cognito.exchangeCodeForIdToken).not.toHaveBeenCalled();
    });

    it('rejects a callback without the state cookie', async () => {
      const { controller } = build();

      await expect(
        controller.callback(
          'code',
          'abc',
          request('abc', null),
          createResponse()
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a callback without a code', async () => {
      const { controller } = build();

      await expect(
        controller.callback(undefined, 'abc', request(), createResponse())
      ).rejects.toThrow(UnauthorizedException);
    });

    it('does not set the session when the ID token is invalid', async () => {
      const cognito = createCognito({
        verifyIdToken: jest.fn().mockRejectedValue(new UnauthorizedException()),
      });
      const { controller } = build(cognito);
      const response = createResponse();

      await expect(
        controller.callback('code', 'abc', request(), response)
      ).rejects.toThrow(UnauthorizedException);
      expect(response.cookie).not.toHaveBeenCalledWith(
        'access_token',
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('user-info', () => {
    it('returns the user of a valid cookie', async () => {
      const { controller } = build();

      const info = await controller.getUserInfo({
        cookies: { access_token: 'id-token' },
      } as never);

      expect(info).toEqual({
        sub: IDENTITY.id,
        email: IDENTITY.email,
        picture: IDENTITY.picture,
      });
    });

    it('says the session expired when there is no cookie', async () => {
      const { controller } = build();

      await expect(
        controller.getUserInfo({ cookies: {} } as never)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('removes the cookie and returns the Cognito logout URL (no redirect, the call is XHR)', async () => {
      const { controller } = build();
      const response = createResponse();

      const result = await controller.revokeToken({ cookies: {} }, response);

      expect(response.clearCookie).toHaveBeenCalledWith('access_token');
      expect(response.redirect).not.toHaveBeenCalled();
      expect(result).toEqual({ logoutUrl: 'https://hosted/logout' });
    });
  });
});

describe('AuthService.signInUser', () => {
  const build = (existingUser: unknown) => {
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue(existingUser) },
    };
    const userService = {
      tryRegisterUser: jest.fn().mockResolvedValue({ id: IDENTITY.id }),
    };
    return {
      prisma,
      userService,
      service: new AuthService(
        prisma as unknown as PrismaService,
        userService as unknown as UserService
      ),
    };
  };

  it('returns the existing user without registering again', async () => {
    const { service, userService } = build({ id: IDENTITY.id });

    const user = await service.signInUser(IDENTITY);

    expect(user).toEqual({ id: IDENTITY.id });
    expect(userService.tryRegisterUser).not.toHaveBeenCalled();
  });

  it('registers a new user with the provider id, e-mail and picture', async () => {
    const { service, userService } = build(null);

    await service.signInUser(IDENTITY);

    expect(userService.tryRegisterUser).toHaveBeenCalledWith(
      IDENTITY.id,
      IDENTITY.email,
      IDENTITY.picture
    );
  });
});
