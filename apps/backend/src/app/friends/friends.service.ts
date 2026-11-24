import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FriendshipStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { isDemoUserId } from '../demo/demo-users';

export type FriendUser = { id: string; email: string; picture: string };

export type FriendsOverview = {
  friends: Array<FriendUser>;
  // `id` is the user id; for `incoming` it is the friendship id to respond to
  incoming: Array<FriendUser>;
  outgoing: Array<FriendUser>;
};

@Injectable()
export class FriendsService {
  constructor(private readonly prismaService: PrismaService) {}

  async sendRequest(userId: string | number, email: string): Promise<void> {
    const myId = String(userId);
    const targetEmail = (email ?? '').trim();

    const target = targetEmail
      ? await this.prismaService.user.findFirst({
          where: { email: { equals: targetEmail, mode: 'insensitive' } },
        })
      : null;

    if (target && String(target.id) === myId) {
      throw new BadRequestException('You cannot add yourself as a friend');
    }

    // Same answer for existing and missing accounts: don't reveal who has one.
    if (!target) {
      return;
    }

    const targetId = String(target.id);
    // the shared demo account must not reach real users
    if (isDemoUserId(myId) && !isDemoUserId(targetId)) {
      return;
    }

    const existing = await this.prismaService.friendship.findFirst({
      where: {
        OR: [
          { requesterId: myId, addresseeId: targetId },
          { requesterId: targetId, addresseeId: myId },
        ],
      },
    });

    if (!existing) {
      await this.prismaService.friendship.create({
        data: { requesterId: myId, addresseeId: targetId },
      });
      return;
    }

    // they already asked me: asking back means yes
    if (
      existing.status === FriendshipStatus.PENDING &&
      String(existing.addresseeId) === myId
    ) {
      await this.prismaService.friendship.update({
        where: { id: existing.id },
        data: { status: FriendshipStatus.ACCEPTED },
      });
    }
  }

  async respond(
    userId: string | number,
    friendshipId: string,
    accept: boolean
  ): Promise<void> {
    const myId = String(userId);
    // only the addressee of a pending request can answer it
    const request = await this.prismaService.friendship.findFirst({
      where: {
        id: friendshipId,
        addresseeId: myId,
        status: FriendshipStatus.PENDING,
      },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (accept) {
      await this.prismaService.friendship.update({
        where: { id: request.id },
        data: { status: FriendshipStatus.ACCEPTED },
      });
    } else {
      await this.prismaService.friendship.deleteMany({
        where: { id: request.id },
      });
    }
  }

  async remove(userId: string | number, otherUserId: string): Promise<void> {
    const myId = String(userId);
    await this.prismaService.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: myId, addresseeId: otherUserId },
          { requesterId: otherUserId, addresseeId: myId },
        ],
      },
    });
  }

  async list(userId: string | number): Promise<FriendsOverview> {
    const myId = String(userId);
    const friendships = await this.findMyFriendships(myId);
    const toUser = (user: {
      id: unknown;
      email: string;
      picture: string;
    }): FriendUser => ({
      id: String(user.id),
      email: user.email,
      picture: user.picture,
    });

    const overview: FriendsOverview = {
      friends: [],
      incoming: [],
      outgoing: [],
    };

    for (const friendship of friendships) {
      const iAmRequester = String(friendship.requesterId) === myId;
      const other = toUser(
        iAmRequester ? friendship.addressee : friendship.requester
      );

      if (friendship.status === FriendshipStatus.ACCEPTED) {
        overview.friends.push(other);
      } else if (iAmRequester) {
        overview.outgoing.push(other);
      } else {
        overview.incoming.push({ ...other, id: friendship.id });
      }
    }

    return overview;
  }

  async getAcceptedFriends(
    userId: string | number
  ): Promise<Array<FriendUser>> {
    return (await this.list(userId)).friends;
  }

  private async findMyFriendships(myId: string) {
    return this.prismaService.friendship.findMany({
      where: {
        OR: [{ requesterId: myId }, { addresseeId: myId }],
      },
      include: { requester: true, addressee: true },
    });
  }
}
