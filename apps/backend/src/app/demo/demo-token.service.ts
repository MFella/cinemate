import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const PREFIX = 'demo';
export const DEMO_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * Session token of the demo account: `demo.<expires at, ms>.<HMAC-SHA256>`.
 * Only this backend can issue it and it opens the demo account only. Without
 * DEMO_TOKEN_SECRET the key is random per process, so a restart ends demo sessions.
 */
@Injectable()
export class DemoTokenService {
  private readonly secret: string;

  constructor(configService: ConfigService) {
    this.secret =
      configService.get<{ tokenSecret?: string }>('demo')?.tokenSecret ||
      randomBytes(32).toString('hex');
  }

  static isDemoToken(token: string): boolean {
    return typeof token === 'string' && token.startsWith(`${PREFIX}.`);
  }

  sign(now = Date.now()): string {
    const payload = `${PREFIX}.${now + DEMO_TOKEN_TTL_MS}`;
    return `${payload}.${this.mac(payload)}`;
  }

  verify(token: string, now = Date.now()): boolean {
    const parts = typeof token === 'string' ? token.split('.') : [];
    if (parts.length !== 3 || parts[0] !== PREFIX) {
      return false;
    }

    const [, expiresAt, signature] = parts;
    const expected = Buffer.from(this.mac(`${PREFIX}.${expiresAt}`));
    const given = Buffer.from(signature);
    return (
      given.length === expected.length &&
      timingSafeEqual(given, expected) &&
      Number(expiresAt) > now
    );
  }

  private mac(payload: string): string {
    return createHmac('sha256', this.secret)
      .update(payload)
      .digest('base64url');
  }
}
