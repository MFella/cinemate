import { Module } from '@nestjs/common';

import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import baseConfiguration from './configuration/base-configuration';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { MoviesModule } from './movies/movies.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [baseConfiguration],
    }),
    AuthModule,
    UserModule,
    MoviesModule,
  ],
})
export class AppModule {}
