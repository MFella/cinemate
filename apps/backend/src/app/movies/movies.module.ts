import { Module } from '@nestjs/common';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { BaseRestDataService } from '../common/base-rest-data.service';
import { PrismaService } from 'backend/database/prisma.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [MoviesService, BaseRestDataService, PrismaService],
  controllers: [MoviesController],
})
export class MoviesModule {}
