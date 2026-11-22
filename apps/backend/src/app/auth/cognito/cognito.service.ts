import { Inject, Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { AuthSource } from '../../typings/common';
import { CognitoIdentity, toCognitoIdentity } from './cognito-identity';

export type CognitoConfig = {
  region: string;
  userPoolId: string;
  clientId: string;
  clientSecret: string;
  /** Hosted UI domain, e.g. `cinemate.auth.eu-central-1.amazoncognito.com` */
  domain: string;
  /** Where Cognito sends the user back with the code (the backend callback). */
  redirectUri: string;
  /** Where Cognito sends the user after logout (the frontend). */
  logoutUri: string;
};

export type IdTokenVerifier = {
  verify(token: string): Promise<Record<string, unknown>>;
};

export const ID_TOKEN_VERIFIER = 'ID_TOKEN_VERIFIER';

const IDENTITY_PROVIDER_NAMES: Record<AuthSource, string> = {
  google: 'Google',
  facebook: 'Facebook',
};

@Injectable()
export class CognitoService {
  private verifier?: IdTokenVerifier;

  constructor(
    private readonly configService: ConfigService,
    @Optional() @Inject(ID_TOKEN_VERIFIER) verifier?: IdTokenVerifier
  ) {
    this.verifier = verifier;
  }

  private get config(): CognitoConfig {
    return this.configService.get<CognitoConfig>('cognito');
  }

  private get baseUrl(): string {
    return `https://${this.config.domain}`;
  }

  getAuthorizeUrl(provider: AuthSource, state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      scope: 'openid email profile',
      redirect_uri: this.config.redirectUri,
      state,
      identity_provider: IDENTITY_PROVIDER_NAMES[provider],
    });
    return `${this.baseUrl}/oauth2/authorize?${params}`;
  }

  getLogoutUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      logout_uri: this.config.logoutUri,
    });
    return `${this.baseUrl}/logout?${params}`;
  }

  /** Trades the authorization code for tokens; returns the ID token. */
  async exchangeCodeForIdToken(code: string): Promise<string> {
    const { clientId, clientSecret, redirectUri } = this.config;

    const response = await fetch(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Sign-in code was not accepted');
    }

    const tokens = (await response.json()) as { id_token?: string };
    if (!tokens.id_token) {
      throw new UnauthorizedException('Sign-in returned no ID token');
    }
    return tokens.id_token;
  }

  /** Checks signature, expiry, issuer, audience and token type; returns the user. */
  async verifyIdToken(token: string): Promise<CognitoIdentity> {
    let claims: Record<string, unknown>;
    try {
      claims = await this.getVerifier().verify(token);
    } catch {
      throw new UnauthorizedException();
    }
    return toCognitoIdentity(claims);
  }

  private getVerifier(): IdTokenVerifier {
    // created on first use: needs the configuration, and fetches keys lazily
    this.verifier ??= CognitoJwtVerifier.create({
      userPoolId: this.config.userPoolId,
      clientId: this.config.clientId,
      tokenUse: 'id',
    }) as unknown as IdTokenVerifier;
    return this.verifier;
  }
}
