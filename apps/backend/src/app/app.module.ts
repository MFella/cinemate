import { Module } from '@nestjs/common';

import { HttpModule } from '@nestjs/axios';
import { MoviesController } from './movies/movies.controller';
import { MoviesService } from './movies/movies.service';
import { PrismaService } from './database/prisma.service';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { ConfigModule } from '@nestjs/config';
import baseConfiguration from './configuration/base-configuration';
import { BaseRestDataService } from './common/base-rest-data.service';
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
  providers: [BaseRestDataService, PrismaService],
})
export class AppModule {}
