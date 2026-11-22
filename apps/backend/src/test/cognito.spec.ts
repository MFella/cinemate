import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CognitoService } from '../app/auth/cognito/cognito.service';
import { toCognitoIdentity } from '../app/auth/cognito/cognito-identity';

const CONFIG = {
  region: 'eu-central-1',
  userPoolId: 'eu-central-1_abc123',
  clientId: 'client-id',
  clientSecret: 'client-secret',
  domain: 'cinemate-test.auth.eu-central-1.amazoncognito.com',
  redirectUri: 'http://localhost:3000/api/auth/callback',
  logoutUri: 'http://localhost:4200',
};

const googleClaims = {
  sub: 'cognito-uuid',
  email: 'anna@example.com',
  picture: 'https://example.com/anna.jpg',
  identities: [
    { userId: '110248495921238986420', providerName: 'Google' },
  ],
};

describe('toCognitoIdentity', () => {
  it('uses the identity provider user id, so existing users keep their data', () => {
    expect(toCognitoIdentity(googleClaims)).toEqual({
      id: '110248495921238986420',
      provider: 'google',
      email: 'anna@example.com',
      picture: 'https://example.com/anna.jpg',
    });
  });

  it('understands Facebook users', () => {
    const identity = toCognitoIdentity({
      ...googleClaims,
      identities: [{ userId: '5555', providerName: 'Facebook' }],
    });

    expect(identity.provider).toBe('facebook');
    expect(identity.id).toBe('5555');
  });

  it('accepts `identities` sent as a JSON string', () => {
    const identity = toCognitoIdentity({
      ...googleClaims,
      identities: JSON.stringify(googleClaims.identities),
    });

    expect(identity.id).toBe('110248495921238986420');
  });

  it('reads the picture url from the JSON that Facebook sends', () => {
    const identity = toCognitoIdentity({
      ...googleClaims,
      picture: JSON.stringify({ data: { url: 'https://fb.example/pic.jpg' } }),
    });

    expect(identity.picture).toBe('https://fb.example/pic.jpg');
  });

  it('uses an empty picture when the provider sent none', () => {
    const { picture: _picture, ...withoutPicture } = googleClaims;

    expect(toCognitoIdentity(withoutPicture).picture).toBe('');
  });

  it('rejects users that do not come from a social provider', () => {
    const { identities: _identities, ...native } = googleClaims;

    expect(() => toCognitoIdentity(native)).toThrow(UnauthorizedException);
  });

  it('rejects an unsupported provider', () => {
    expect(() =>
      toCognitoIdentity({
        ...googleClaims,
        identities: [{ userId: '1', providerName: 'Twitter' }],
      })
    ).toThrow(UnauthorizedException);
  });

  it('rejects a user without an e-mail', () => {
    const { email: _email, ...withoutEmail } = googleClaims;

    expect(() => toCognitoIdentity(withoutEmail)).toThrow(
      UnauthorizedException
    );
  });
});

describe('CognitoService', () => {
  const configService = {
    get: (key: string) => (key === 'cognito' ? CONFIG : undefined),
  } as unknown as ConfigService;

  const build = (verify = jest.fn()) => ({
    verify,
    service: new CognitoService(configService, { verify }),
  });

  describe('getAuthorizeUrl', () => {
    it('sends the user to the hosted UI with the code flow and the state', () => {
      const { service } = build();

      const url = new URL(service.getAuthorizeUrl('google', 'state-123'));

      expect(url.origin).toBe(`https://${CONFIG.domain}`);
      expect(url.pathname).toBe('/oauth2/authorize');
      expect(Object.fromEntries(url.searchParams)).toEqual({
        client_id: CONFIG.clientId,
        response_type: 'code',
        scope: 'openid email profile',
        redirect_uri: CONFIG.redirectUri,
        state: 'state-123',
        identity_provider: 'Google',
      });
    });

    it('selects the Facebook provider', () => {
      const { service } = build();

      const url = new URL(service.getAuthorizeUrl('facebook', 's'));

      expect(url.searchParams.get('identity_provider')).toBe('Facebook');
    });
  });

  describe('getLogoutUrl', () => {
    it('ends the Cognito session and returns to the frontend', () => {
      const { service } = build();

      const url = new URL(service.getLogoutUrl());

      expect(url.pathname).toBe('/logout');
      expect(url.searchParams.get('client_id')).toBe(CONFIG.clientId);
      expect(url.searchParams.get('logout_uri')).toBe(CONFIG.logoutUri);
    });
  });

  describe('exchangeCodeForIdToken', () => {
    const originalFetch = global.fetch;
    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('trades the code for tokens using the client secret', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id_token: 'the-id-token', access_token: 'x' }),
      });
      global.fetch = fetchMock as never;
      const { service } = build();

      const idToken = await service.exchangeCodeForIdToken('auth-code');

      expect(idToken).toBe('the-id-token');
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`https://${CONFIG.domain}/oauth2/token`);
      expect(init.method).toBe('POST');
      expect(init.headers['Authorization']).toBe(
        `Basic ${Buffer.from(
          `${CONFIG.clientId}:${CONFIG.clientSecret}`
        ).toString('base64')}`
      );
      expect(Object.fromEntries(new URLSearchParams(init.body))).toEqual({
        grant_type: 'authorization_code',
        client_id: CONFIG.clientId,
        code: 'auth-code',
        redirect_uri: CONFIG.redirectUri,
      });
    });

    it('rejects when Cognito refuses the code', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: false, status: 400 }) as never;
      const { service } = build();

      await expect(service.exchangeCodeForIdToken('bad')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('rejects when the answer has no ID token', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({}) }) as never;
      const { service } = build();

      await expect(service.exchangeCodeForIdToken('code')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('verifyIdToken', () => {
    it('returns the identity of a valid token', async () => {
      const { service, verify } = build(
        jest.fn().mockResolvedValue(googleClaims)
      );

      const identity = await service.verifyIdToken('token');

      expect(verify).toHaveBeenCalledWith('token');
      expect(identity.id).toBe('110248495921238986420');
    });

    it('rejects a token the verifier does not accept (bad signature, expired, wrong pool)', async () => {
      const { service } = build(
        jest.fn().mockRejectedValue(new Error('Token expired'))
      );

      await expect(service.verifyIdToken('token')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
