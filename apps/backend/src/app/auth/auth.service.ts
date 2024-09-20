import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { UserService } from '../user/user.service';
import { User } from '@prisma/client';

type UserToRegister = {
  id: number;
  email: string;
};

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private readonly prismaService: PrismaService,
    private readonly userService: UserService
  ) {}

  generateJwt(payload): string {
    return this.jwtService.sign(payload);
  }

  async signInUser(userToRegister: UserToRegister): Promise<string> {
    if (!userToRegister) {
      throw new BadRequestException('Unauthenticated');
    }

    let userFromDb = await this.getUserById(userToRegister.id);

    if (!userFromDb) {
      userFromDb = await this.userService.tryRegisterUser(
        userToRegister.id,
        userToRegister.email
      );
      if (!userFromDb) {
        throw new InternalServerErrorException(
          `Error occured during creation of user with id: ${userToRegister.id}`
        );
      }
    }

    return this.generateJwt({
      sub: userFromDb.id,
      email: userFromDb.email,
    });
  }

  async getUserById(userId: number): Promise<User> {
    return await this.prismaService.user.findFirst({
      where: {
        id: userId,
      },
    });
  }
}
