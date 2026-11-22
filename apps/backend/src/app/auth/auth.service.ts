import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { UserService } from '../user/user.service';
import { CognitoIdentity } from './cognito/cognito-identity';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService
  ) {}

  /** Finds the user of a verified sign-in, registering them on the first one. */
  async signInUser(identity: CognitoIdentity): Promise<User> {
    const existingUser = await this.getUserById(identity.id);
    if (existingUser) {
      return existingUser;
    }

    const registeredUser = await this.userService.tryRegisterUser(
      identity.id,
      identity.email,
      identity.picture
    );
    if (!registeredUser) {
      throw new InternalServerErrorException(
        `Error occured during creation of user with id: ${identity.id}`
      );
    }
    return registeredUser;
  }

  async getUserById(userId: string): Promise<User> {
    return await this.prismaService.user.findFirst({
      where: { id: userId },
    });
  }
}
