import { randomBytes } from 'node:crypto';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CognitoService } from './cognito/cognito.service';
import { SessionService } from './session.service';
import { DemoService } from '../demo/demo.service';
import {
  DEMO_TOKEN_TTL_MS,
  DemoTokenService,
} from '../demo/demo-token.service';
import type {
  AuthSource,
  CookieNames,
  UserJwtPayload,
} from '../typings/common';

const ACCESS_TOKEN_COOKIE: CookieNames = 'access_token';
const STATE_COOKIE = 'oauth_state';
const STATE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;
const ACCESS_TOKEN_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  private readonly isDevMode: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly cognitoService: CognitoService,
    private readonly sessionService: SessionService,
    private readonly demoService: DemoService,
    private readonly demoTokenService: DemoTokenService
  ) {
    this.isDevMode = !!configService.get('isDevMode');
  }

  @Get('google')
  loginWithGoogle(@Res() response: Response): void {
    this.login('google', response);
  }

  @Get('facebook')
  loginWithFacebook(@Res() response: Response): void {
    this.login('facebook', response);
  }

  login(
    provider: AuthSource,
    response: Pick<Response, 'cookie' | 'redirect'>
  ): void {
    // `state` ties the callback to this browser (protects against forged callbacks)
    const state = randomBytes(24).toString('base64url');
    response.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      secure: !this.isDevMode,
      // the callback is a top-level navigation from the Cognito domain
      sameSite: 'lax',
      maxAge: STATE_COOKIE_MAX_AGE_MS,
    });
    response.redirect(this.cognitoService.getAuthorizeUrl(provider, state));
  }

  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() request: Request,
    @Res() response: Response
  ): Promise<void> {
    const expectedState = request.cookies?.[STATE_COOKIE];
    if (!code || !state || !expectedState || state !== expectedState) {
      throw new UnauthorizedException('Sign-in could not be verified');
    }

    const idToken = await this.cognitoService.exchangeCodeForIdToken(code);
    const identity = await this.cognitoService.verifyIdToken(idToken);
    await this.authService.signInUser(identity);

    response.clearCookie(STATE_COOKIE);
    response.cookie(ACCESS_TOKEN_COOKIE, idToken, {
      maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE_MS,
      sameSite: this.isDevMode ? true : 'none',
      secure: !this.isDevMode,
      httpOnly: true,
    });
    response.redirect(`${this.configService.get<string>('frontendUrl')}/match`);
  }

  @Get('user-info')
  async getUserInfo(@Req() request: Request): Promise<UserJwtPayload> {
    const token = request.cookies?.[ACCESS_TOKEN_COOKIE];
    if (!token) {
      throw new UnauthorizedException('Session has expired');
    }

    const identity = await this.sessionService.resolve(token);
    return {
      sub: identity.id,
      email: identity.email,
      picture: identity.picture,
    };
  }

  /** What the login page can offer (the demo button shows only when this is on). */
  @Get('options')
  getOptions(): { demo: boolean } {
    return { demo: this.demoService.isEnabled };
  }

  /** Signs in to the shared demo account, after making sure its data is fresh. */
  @Post('demo')
  @HttpCode(204)
  async startDemo(
    @Res({ passthrough: true }) response: Pick<Response, 'cookie'>
  ): Promise<void> {
    if (!this.demoService.isEnabled) {
      throw new NotFoundException();
    }

    await this.demoService.ensureFresh();
    response.cookie(ACCESS_TOKEN_COOKIE, this.demoTokenService.sign(), {
      maxAge: DEMO_TOKEN_TTL_MS,
      sameSite: this.isDevMode ? true : 'none',
      secure: !this.isDevMode,
      httpOnly: true,
    });
  }

  @Delete('token')
  async revokeToken(
    @Req() request: Pick<Request, 'cookies'>,
    @Res({ passthrough: true }) response: Response
  ): Promise<{ logoutUrl: string }> {
    response.clearCookie(ACCESS_TOKEN_COOKIE);
    if (
      this.sessionService.isDemoSession(request.cookies?.[ACCESS_TOKEN_COOKIE])
    ) {
      // the demo has no Cognito session to end
      return { logoutUrl: this.configService.get<string>('frontendUrl') };
    }
    // The frontend calls this through XHR, which cannot follow a cross-origin redirect.
    // It navigates to this URL itself, which ends the Cognito session too.
    return { logoutUrl: this.cognitoService.getLogoutUrl() };
  }
}
