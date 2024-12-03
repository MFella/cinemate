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

type CookieOptions = 'maxAge' | 'sameSite' | 'secure' | 'httpOnly';

@Controller('auth')
export class AuthController {
  private static readonly ACCESS_TOKEN_COOKIE_NAME: CookieNames =
    'access_token';
  private cookieSignOptions: Partial<
    Record<CookieOptions, string | number | boolean | Date>
  > = {};
  private accessToken: string = '';

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {
    const isDevMode = configService.get('isDevMode');
    this.cookieSignOptions = {
      maxAge: 3600 * 1000 * 24,
      sameSite: isDevMode ? true : 'None',
      secure: isDevMode ? false : true,
      httpOnly: true,
    };
  }

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
    this.accessToken = await this.authService.signInUser<'google'>(
      request.user
    );

    response.cookie(
      AuthController.ACCESS_TOKEN_COOKIE_NAME,
      this.accessToken,
      this.cookieSignOptions
    );

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
    response.clearCookie(AuthController.ACCESS_TOKEN_COOKIE_NAME);
    response
      .status(HttpStatus.OK)
      .redirect(`${this.configService.get<string>('frontendUrl')}`);
  }
}
