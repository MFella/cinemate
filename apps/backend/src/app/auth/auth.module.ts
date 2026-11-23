import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { UserService } from '../user/user.service';
import { FriendsService } from '../friends/friends.service';

@Module({
  imports: [ConfigModule],
  providers: [AuthService, PrismaService, UserService, FriendsService],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
