import { Module } from '@nestjs/common';

import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import baseConfiguration from './configuration/base-configuration';
import { AuthModule } from './auth/auth.module';
import { CognitoModule } from './auth/cognito/cognito.module';
import { DemoModule } from './demo/demo.module';
import { UserModule } from './user/user.module';
import { MoviesModule } from './movies/movies.module';
import { FriendsModule } from './friends/friends.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [baseConfiguration],
    }),
    CognitoModule,
    DemoModule,
    AuthModule,
    UserModule,
    MoviesModule,
    FriendsModule,
  ],
})
export class AppModule {}
