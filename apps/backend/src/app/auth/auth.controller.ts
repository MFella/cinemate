import { randomBytes } from 'node:crypto';
import {
  Controller,
  Delete,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CognitoService } from './cognito/cognito.service';
import type { AuthSource, CookieNames, UserJwtPayload } from '../typings/common';

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
    private readonly cognitoService: CognitoService
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

  login(provider: AuthSource, response: Pick<Response, 'cookie' | 'redirect'>): void {
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

    const identity = await this.cognitoService.verifyIdToken(token);
    return {
      sub: identity.id,
      email: identity.email,
      picture: identity.picture,
    };
  }

  @Delete('token')
  async revokeToken(@Res() response: Response): Promise<void> {
    response.clearCookie(ACCESS_TOKEN_COOKIE);
    // also ends the Cognito session, so the next login asks for the account again
    response.redirect(this.cognitoService.getLogoutUrl());
  }
}
