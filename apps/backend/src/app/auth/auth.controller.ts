import {
  Controller,
  Get,
  HttpStatus,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
@UseGuards(GoogleOauthGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  @Get('google')
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async loginUser(): Promise<void> {}

  @Get('google/cb')
  async afterGoogleAuthCallback(
    @Request() request,
    @Response() response
  ): Promise<void> {
    const accessToken = await this.authService.signInUser<'google'>(
      request.user
    );

    const isDevMode = await this.configService.get('isDevMode');

    response.cookie('access_token', accessToken, {
      maxAge: 3600 * 24 * 1000,
      sameSite: isDevMode ? true : 'None',
      secure: isDevMode ? false : true,
    });
    response
      .status(HttpStatus.OK)
      .redirect(`${this.configService.get<string>('frontendUrl')}/match`);
  }
}
