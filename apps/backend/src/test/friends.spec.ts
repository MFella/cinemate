import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FriendsService } from '../app/friends/friends.service';
import { PrismaService } from '../app/database/prisma.service';

type DbUser = { id: string; email: string; picture: string };
type DbFriendship = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'PENDING' | 'ACCEPTED';
};
type Pair = { requesterId: string; addresseeId: string };

const ME = { id: '1', email: 'me@example.com', picture: '' };
const ANNA = { id: '2', email: 'anna@example.com', picture: '' };
const BOB = { id: '3', email: 'bob@example.com', picture: '' };

// In-memory stand-in for the Prisma calls FriendsService makes.
const createPrismaMock = (
  users: Array<DbUser>,
  initial: Array<DbFriendship> = []
) => {
  let friendships = [...initial];
  let nextId = 1;
  const same = (a: unknown, b: unknown) => String(a) === String(b);
  const matches = (f: DbFriendship, where: Record<string, unknown>): boolean =>
    Object.entries(where).every(([key, value]) => {
      if (key === 'OR') {
        return (value as Array<Record<string, unknown>>).some(w =>
          matches(f, w)
        );
      }
      return same((f as Record<string, unknown>)[key], value);
    });
  const withUsers = (f: DbFriendship) => ({
    ...f,
    requester: users.find(u => u.id === f.requesterId),
    addressee: users.find(u => u.id === f.addresseeId),
  });

  const prisma = {
    user: {
      findFirst: jest.fn(
        async ({ where }: { where: { email: { equals: string } } }) =>
          users.find(
            u => u.email.toLowerCase() === where.email.equals.toLowerCase()
          ) ?? null
      ),
    },
    friendship: {
      findFirst: jest.fn(async ({ where }) =>
        friendships.find(f => matches(f, where))
          ? withUsers(friendships.find(f => matches(f, where)))
          : null
      ),
      findMany: jest.fn(async ({ where }) =>
        friendships.filter(f => matches(f, where)).map(withUsers)
      ),
      create: jest.fn(async ({ data }: { data: Pair }) => {
        const created: DbFriendship = {
          id: `f-${nextId++}`,
          status: 'PENDING',
          ...data,
        };
        friendships.push(created);
        return created;
      }),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { status: 'ACCEPTED' };
        }) => {
          const found = friendships.find(f => f.id === where.id);
          Object.assign(found, data);
          return found;
        }
      ),
      deleteMany: jest.fn(async ({ where }) => {
        const before = friendships.length;
        friendships = friendships.filter(f => !matches(f, where));
        return { count: before - friendships.length };
      }),
    },
  };

  return { prisma, getFriendships: () => friendships };
};

describe('FriendsService', () => {
  const build = (initial: Array<DbFriendship> = []) => {
    const mock = createPrismaMock([ME, ANNA, BOB], initial);
    return {
      ...mock,
      service: new FriendsService(mock.prisma as unknown as PrismaService),
    };
  };

  const pending = (from: DbUser, to: DbUser, id = 'f-0'): DbFriendship => ({
    id,
    requesterId: from.id,
    addresseeId: to.id,
    status: 'PENDING',
  });
  const accepted = (a: DbUser, b: DbUser, id = 'f-0'): DbFriendship => ({
    ...pending(a, b, id),
    status: 'ACCEPTED',
  });

  describe('sendRequest', () => {
    it('creates a pending request that is not a friendship yet', async () => {
      const { service, getFriendships } = build();

      await service.sendRequest(ME.id, 'anna@example.com');

      expect(getFriendships()).toEqual([
        expect.objectContaining({
          requesterId: ME.id,
          addresseeId: ANNA.id,
          status: 'PENDING',
        }),
      ]);
      expect(await service.getAcceptedFriends(ME.id)).toEqual([]);
    });

    it('finds the user regardless of letter case and spaces', async () => {
      const { service, getFriendships } = build();

      await service.sendRequest(ME.id, '  ANNA@Example.com ');

      expect(getFriendships()).toHaveLength(1);
    });

    it('does not reveal whether an e-mail has an account', async () => {
      const { service, getFriendships } = build();

      await expect(
        service.sendRequest(ME.id, 'nobody@example.com')
      ).resolves.toBeUndefined();
      expect(getFriendships()).toEqual([]);
    });

    it('rejects a request to yourself', async () => {
      const { service } = build();

      await expect(
        service.sendRequest(ME.id, 'ME@example.com')
      ).rejects.toThrow(BadRequestException);
    });

    it('does not duplicate an already sent request', async () => {
      const { service, getFriendships } = build([pending(ME, ANNA)]);

      await service.sendRequest(ME.id, ANNA.email);

      expect(getFriendships()).toHaveLength(1);
    });

    it('does not touch an existing friendship', async () => {
      const { service, getFriendships } = build([accepted(ANNA, ME)]);

      await service.sendRequest(ME.id, ANNA.email);

      expect(getFriendships()).toEqual([accepted(ANNA, ME)]);
    });

    it('accepts automatically when the other user already asked me', async () => {
      const { service, getFriendships } = build([pending(ANNA, ME)]);

      await service.sendRequest(ME.id, ANNA.email);

      expect(getFriendships()).toHaveLength(1);
      expect(getFriendships()[0].status).toBe('ACCEPTED');
    });
  });

  describe('respond', () => {
    it('lets the addressee accept a request', async () => {
      const { service, getFriendships } = build([pending(ANNA, ME, 'f-9')]);

      await service.respond(ME.id, 'f-9', true);

      expect(getFriendships()[0].status).toBe('ACCEPTED');
      expect((await service.getAcceptedFriends(ME.id)).map(f => f.id)).toEqual([
        ANNA.id,
      ]);
    });

    it('lets the addressee decline, which removes the request', async () => {
      const { service, getFriendships } = build([pending(ANNA, ME, 'f-9')]);

      await service.respond(ME.id, 'f-9', false);

      expect(getFriendships()).toEqual([]);
    });

    it('does not let the requester accept their own request', async () => {
      const { service, getFriendships } = build([pending(ME, ANNA, 'f-9')]);

      await expect(service.respond(ME.id, 'f-9', true)).rejects.toThrow(
        NotFoundException
      );
      expect(getFriendships()[0].status).toBe('PENDING');
    });

    it('does not let a third user answer a request', async () => {
      const { service } = build([pending(ANNA, ME, 'f-9')]);

      await expect(service.respond(BOB.id, 'f-9', true)).rejects.toThrow(
        NotFoundException
      );
    });

    it('rejects an unknown request', async () => {
      const { service } = build();

      await expect(service.respond(ME.id, 'nope', true)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('remove', () => {
    it('removes a friendship whoever started it', async () => {
      const { service, getFriendships } = build([accepted(ANNA, ME)]);

      await service.remove(ME.id, ANNA.id);

      expect(getFriendships()).toEqual([]);
    });

    it('cancels my own pending request', async () => {
      const { service, getFriendships } = build([pending(ME, ANNA)]);

      await service.remove(ME.id, ANNA.id);

      expect(getFriendships()).toEqual([]);
    });

    it("does not remove other people's friendships", async () => {
      const { service, getFriendships } = build([accepted(ANNA, BOB)]);

      await service.remove(ME.id, ANNA.id);

      expect(getFriendships()).toHaveLength(1);
    });
  });

  describe('list', () => {
    it('separates friends, incoming and outgoing requests', async () => {
      const { service } = build([
        accepted(ME, ANNA, 'f-1'),
        pending(BOB, ME, 'f-2'),
      ]);

      const result = await service.list(ME.id);

      expect(result.friends.map(f => f.email)).toEqual([ANNA.email]);
      expect(result.incoming).toEqual([
        { id: 'f-2', email: BOB.email, picture: '' },
      ]);
      expect(result.outgoing).toEqual([]);
    });

    it('shows my pending request as outgoing, not as a friend', async () => {
      const { service } = build([pending(ME, ANNA, 'f-1')]);

      const result = await service.list(ME.id);

      expect(result.friends).toEqual([]);
      expect(result.outgoing.map(f => f.email)).toEqual([ANNA.email]);
    });

    it("does not show other users' friendships", async () => {
      const { service } = build([accepted(ANNA, BOB)]);

      const result = await service.list(ME.id);

      expect(result).toEqual({ friends: [], incoming: [], outgoing: [] });
    });
  });
});
