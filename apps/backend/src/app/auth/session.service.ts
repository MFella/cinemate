import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CognitoService } from './cognito/cognito.service';
import { DemoService } from '../demo/demo.service';
import { DemoTokenService } from '../demo/demo-token.service';
import { DEMO_USER } from '../demo/demo-users';

export type SessionIdentity = { id: string; email: string; picture: string };

/** Turns the value of the `access_token` cookie into the signed-in user. */
@Injectable()
export class SessionService {
  constructor(
    private readonly cognitoService: CognitoService,
    private readonly demoTokenService: DemoTokenService,
    private readonly demoService: DemoService
  ) {}

  isDemoSession(token: string | undefined): boolean {
    return !!token && DemoTokenService.isDemoToken(token);
  }

  async resolve(token: string): Promise<SessionIdentity> {
    if (DemoTokenService.isDemoToken(token)) {
      if (!this.demoService.isEnabled || !this.demoTokenService.verify(token)) {
        throw new UnauthorizedException('Demo session has expired');
      }
      const { id, email, picture } = DEMO_USER;
      return { id, email, picture };
    }

    return this.cognitoService.verifyIdToken(token);
  }
}
