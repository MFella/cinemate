import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { GoogleOauthStrategy } from './strategies/google.strategy';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { UserService } from '../user/user.service';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'google' }), JwtModule],
  providers: [
    AuthService,
    GoogleOauthStrategy,
    GoogleOauthGuard,
    PrismaService,
    UserService,
  ],
  exports: [PassportModule],
  controllers: [AuthController],
})
export class AuthModule {}
