import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Post,
  Req,
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
  async loginUser(): Promise<void> {}

  @Get('google/cb')
  async afterGoogleAuthCallback(
    @Request() request: any,
    @Response() response: any
  ): Promise<void> {
    const accessToken = await this.authService.signInUser<'google'>(
      request.user
    );

    response.cookie('access_token', accessToken, {
      maxAge: 3600 * 24 * 1000,
      sameSite: true,
      secure: false,
    });
    response
      .status(HttpStatus.OK)
      .redirect(`${this.configService.get<string>('frontendUrl')}/match`);
  }
}
