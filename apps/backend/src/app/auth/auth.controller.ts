import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Request,
  Response,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { AuthService } from './auth.service';
import type { CookieNames, UserJwtPayload } from '../typings/common';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  private static readonly ACCESS_TOKEN_COOKIE_NAME: CookieNames =
    'access_token';

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  @Get('google')
  @UseGuards(GoogleOauthGuard)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async loginUser(): Promise<void> {}

  @Get('google/cb')
  @UseGuards(GoogleOauthGuard)
  async afterGoogleAuthCallback(
    @Request() request,
    @Response() response
  ): Promise<void> {
    const accessToken = await this.authService.signInUser<'google'>(
      request.user
    );

    const isDevMode = await this.configService.get('isDevMode');

    response.cookie(AuthController.ACCESS_TOKEN_COOKIE_NAME, accessToken, {
      maxAge: 3600 * 24 * 1000,
      sameSite: isDevMode ? true : 'None',
      secure: isDevMode ? false : true,
      httpOnly: true,
    });

    response
      .status(HttpStatus.OK)
      .redirect(`${this.configService.get<string>('frontendUrl')}/match`);
  }

  @Get('user-info')
  async getUserInfo(@Request() request): Promise<UserJwtPayload> {
    if (!request.cookies?.[AuthController.ACCESS_TOKEN_COOKIE_NAME]) {
      throw new UnauthorizedException('Session has expired');
    }

    return this.authService.getUserInfoFromCookie(
      request.cookies?.[AuthController.ACCESS_TOKEN_COOKIE_NAME]
    );
  }

  @Delete('token')
  async revokeToken(@Response() response): Promise<void> {
    response.deleteCookie(AuthController.ACCESS_TOKEN_COOKIE_NAME);
    // response.
  }
}
