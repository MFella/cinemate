import { UnauthorizedException } from '@nestjs/common';
import { AuthSource } from '../../typings/common';

/** The user as the application knows them, taken from a verified Cognito ID token. */
export type CognitoIdentity = {
  /** User id at the identity provider (the Google `sub`, the Facebook user id). */
  id: string;
  provider: AuthSource;
  email: string;
  picture: string;
};

type Identity = { userId?: string; providerName?: string };

const PROVIDERS: Record<string, AuthSource> = {
  google: 'google',
  facebook: 'facebook',
};

const parseIdentities = (identities: unknown): Array<Identity> => {
  if (typeof identities === 'string') {
    try {
      return parseIdentities(JSON.parse(identities));
    } catch {
      return [];
    }
  }
  return Array.isArray(identities) ? (identities as Array<Identity>) : [];
};

// Facebook sends the picture as JSON: {"data":{"url":"..."}}
const parsePicture = (picture: unknown): string => {
  if (typeof picture !== 'string') {
    return '';
  }
  if (picture.startsWith('{')) {
    try {
      return JSON.parse(picture)?.data?.url ?? '';
    } catch {
      return '';
    }
  }
  return picture;
};

/**
 * Only users who signed in with Google or Facebook are accepted: their provider id
 * is the application's user id (see docs/adr/0002-cognito-for-authentication.md).
 */
export const toCognitoIdentity = (
  claims: Record<string, unknown>
): CognitoIdentity => {
  const identity = parseIdentities(claims['identities'])[0];
  const provider = PROVIDERS[(identity?.providerName ?? '').toLowerCase()];
  const email = claims['email'];

  if (!identity?.userId || !provider || typeof email !== 'string' || !email) {
    throw new UnauthorizedException('Unsupported sign-in');
  }

  return {
    id: String(identity.userId),
    provider,
    email,
    picture: parsePicture(claims['picture']),
  };
};
