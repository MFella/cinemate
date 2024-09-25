import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OauthGoogleUserInfo } from '../../typings/common';

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
  ): Promise<OauthGoogleUserInfo<'google'>> {
    const { id, emails, photos } = profile;
    return {
      provider: 'google',
      id,
      email: emails?.[0]?.value,
      picture: photos?.[0]?.value,
    };
  }
}
