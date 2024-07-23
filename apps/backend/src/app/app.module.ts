import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpModule } from '@nestjs/axios';
import { MoviesController } from './movies/movies.controller';
import { MoviesService } from './movies/movies.service';
import { PrismaService } from './database/prisma.service';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';

@Module({
  imports: [HttpModule],
  controllers: [AppController, MoviesController, UserController],
  providers: [AppService, MoviesService, PrismaService, UserService],
})
export class AppModule {}
