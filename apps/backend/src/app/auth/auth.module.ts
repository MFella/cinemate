import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { GoogleOauthStrategy } from './strategies/google.strategy';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { UserService } from '../user/user.service';
import { AuthGuard } from '../_guards/auth.guard';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'google' }),
    JwtModule.register({
      global: true,
    }),
  ],
  providers: [
    AuthService,
    GoogleOauthStrategy,
    GoogleOauthGuard,
    PrismaService,
    UserService,
    AuthGuard,
  ],
  exports: [PassportModule, AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
