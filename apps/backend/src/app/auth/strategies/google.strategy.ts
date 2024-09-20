import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type OAuthGoogleConfig = {
  clientId: string;
  clientSecret: string;
  callbackURL: string;
  scope: Array<OauthGoogleScope>;
};

type OauthGoogleScope = 'email' | 'profile';

@Injectable()
export class GoogleOauthStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    const oauthGoogleConfig =
      configService.get<OAuthGoogleConfig>('oauthGoogleConfig');
    super({
      clientID: oauthGoogleConfig.clientId,
      clientSecret: oauthGoogleConfig.clientSecret,
      callbackURL: oauthGoogleConfig.callbackURL,
      scope: oauthGoogleConfig.scope,
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile
  ) {
    const { id, name, emails, photos } = profile;

    // Here a custom User object is returned. In the the repo I'm using a UsersService with repository pattern, learn more here: https://docs.nestjs.com/techniques/database
    return {
      provider: 'google',
      providerId: id,
      name: name.givenName,
      username: emails?.[0]?.value,
      picture: photos?.[0]?.value,
    };
  }
}
