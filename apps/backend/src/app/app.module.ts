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

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [baseConfiguration],
      // validationSchema: Joi.object({
      //   PORT: Joi.number().port().default(3000),
      //   DATABASE_URL: Joi.string(),
      //   DIRECT_URL: Joi.string(),
      //   TMDB_API_TOKEN: Joi.string(),
      //   TMDB_API_URL: Joi.string()
      // })
    }),
    AuthModule,
  ],
  controllers: [MoviesController, UserController],
  providers: [BaseRestDataService, MoviesService, PrismaService, UserService],
})
export class AppModule {}
