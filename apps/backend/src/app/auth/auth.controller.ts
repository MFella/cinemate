import {
  Controller,
  Get,
  HttpStatus,
  Req,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
@UseGuards(GoogleOauthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  async loginUser(@Req() request): Promise<void> {
    console.log(request);
  }

  @Get('google/cb')
  @UseGuards(GoogleOauthGuard)
  async afterGoogleAuthCallback(
    @Request() request: any,
    @Response() response: any
  ): Promise<void> {
    const accessToken = await this.authService.signInUser(request.user);

    response.cookie('access_token', accessToken, {
      maxAge: 3600 * 24,
      sameSite: true,
      secure: false,
    });
    return response.status(HttpStatus.OK);
  }
}
