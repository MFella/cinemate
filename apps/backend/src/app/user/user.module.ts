import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from '../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { FriendsService } from '../friends/friends.service';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    FriendsService,
    PrismaService,
    JwtService,
    ConfigService,
  ],
})
export class UserModule {}
