import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';

@Module({
  controllers: [FriendsController],
  providers: [FriendsService, PrismaService, ConfigService],
})
export class FriendsModule {}
