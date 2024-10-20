import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { UserService } from '../user/user.service';
import { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import {
  AuthSource,
  JwtAuthConfig,
  OauthGoogleUserInfo,
} from '../typings/common';

type UserJwtPayload = {
  sub: string;
  email: string;
  picture: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
    private readonly userService: UserService
  ) {}

  generateJwt(payload: UserJwtPayload): string {
    const jwtSecret =
      this.configService.get<JwtAuthConfig>('jwtConfig')?.secret ?? '';
    return this.jwtService.sign(payload, {
      secret: jwtSecret,
    });
  }

  async signInUser<T extends AuthSource>(
    userToRegister: OauthGoogleUserInfo<T>
  ): Promise<string> {
    if (!userToRegister) {
      throw new BadRequestException('Unauthenticated');
    }

    let userFromDb = await this.getUserById(userToRegister.id);

    if (!userFromDb) {
      userFromDb = await this.userService.tryRegisterUser(
        userToRegister.id,
        userToRegister.email,
        userToRegister.picture
      );
      if (!userFromDb) {
        throw new InternalServerErrorException(
          `Error occured during creation of user with id: ${userToRegister.id}`
        );
      }
    }

    return this.generateJwt({
      sub: userFromDb.id.toString(),
      email: userFromDb.email,
      picture: userFromDb.picture,
    });
  }

  async getUserById(userId: string): Promise<User> {
    return await this.prismaService.user.findFirst({
      where: {
        id: userId,
      },
    });
  }
}
