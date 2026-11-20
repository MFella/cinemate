import { BadRequestException } from '@nestjs/common';
import { UserService } from '../app/user/user.service';
import { PrismaService } from '../app/database/prisma.service';

const GENRES = [
  { id: 4, name: 'Adventure' },
  { id: 7, name: 'Comedy' },
  { id: 9, name: 'Drama' },
];

// In-memory UserGenre table + Genre table; only what UserService preferences use.
const createPrismaMock = (initialUserGenres: Array<[number, number]> = []) => {
  let userGenres = initialUserGenres.map(([userId, genreId]) => ({
    userId,
    genreId,
  }));

  const prisma = {
    genre: {
      findMany: jest.fn(
        async (args?: { where?: { id?: { in: Array<number> } } }) =>
          GENRES.filter(
            g => !args?.where?.id || args.where.id.in.includes(g.id)
          )
      ),
      findFirst: jest.fn(
        async (args: { where: { id?: number; name?: string } }) =>
          GENRES.find(
            g =>
              (args.where.id === undefined || g.id === args.where.id) &&
              (args.where.name === undefined || g.name === args.where.name)
          ) ?? null
      ),
    },
    userGenre: {
      findMany: jest.fn(async (args: { where: { userId: number } }) =>
        userGenres
          .filter(ug => ug.userId === args.where.userId)
          .map(ug => ({ ...ug, genre: GENRES.find(g => g.id === ug.genreId) }))
      ),
      deleteMany: jest.fn(async (args: { where: { userId: number } }) => {
        userGenres = userGenres.filter(ug => ug.userId !== args.where.userId);
        return {};
      }),
      createMany: jest.fn(
        async (args: {
          data: Array<{ userId: number; genreId: number }>;
        }) => {
          userGenres.push(...args.data);
          return { count: args.data.length };
        }
      ),
    },
    $transaction: jest.fn(async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations)
    ),
  };

  return { prisma, getUserGenres: () => userGenres };
};

describe('UserService preferences (many genres)', () => {
  const USER = 1;
  const OTHER = 2;

  const build = (initial: Array<[number, number]> = []) => {
    const mock = createPrismaMock(initial);
    return {
      ...mock,
      service: new UserService(mock.prisma as unknown as PrismaService),
    };
  };

  describe('saveUserPreferences', () => {
    it('stores every selected genre', async () => {
      const { service, getUserGenres } = build();

      expect(await service.saveUserPreferences(USER, [4, 9])).toBe(true);

      expect(getUserGenres().map(g => g.genreId).sort()).toEqual([4, 9]);
    });

    it('replaces the previous selection instead of adding to it', async () => {
      const { service, getUserGenres } = build([[USER, 4]]);

      await service.saveUserPreferences(USER, [7]);

      expect(getUserGenres()).toEqual([{ userId: USER, genreId: 7 }]);
    });

    it("does not touch other users' preferences", async () => {
      const { service, getUserGenres } = build([
        [OTHER, 4],
        [OTHER, 9],
      ]);

      await service.saveUserPreferences(USER, [7]);

      expect(getUserGenres().filter(g => g.userId === OTHER)).toHaveLength(2);
    });

    it('ignores duplicates in the request', async () => {
      const { service, getUserGenres } = build();

      await service.saveUserPreferences(USER, [4, 4, 7]);

      expect(getUserGenres()).toHaveLength(2);
    });

    it('ignores genres that do not exist but keeps the valid ones', async () => {
      const { service, getUserGenres } = build();

      await service.saveUserPreferences(USER, [4, 999]);

      expect(getUserGenres().map(g => g.genreId)).toEqual([4]);
    });

    it('rejects an empty selection and keeps the old one', async () => {
      const { service, getUserGenres } = build([[USER, 4]]);

      await expect(service.saveUserPreferences(USER, [])).rejects.toThrow(
        BadRequestException
      );
      expect(getUserGenres()).toEqual([{ userId: USER, genreId: 4 }]);
    });

    it('rejects a selection with no existing genre and keeps the old one', async () => {
      const { service, getUserGenres } = build([[USER, 4]]);

      await expect(service.saveUserPreferences(USER, [999])).rejects.toThrow(
        BadRequestException
      );
      expect(getUserGenres()).toEqual([{ userId: USER, genreId: 4 }]);
    });
  });

  describe('getUserPreferences', () => {
    it('returns all genres of the user', async () => {
      const { service } = build([
        [USER, 9],
        [USER, 4],
        [OTHER, 7],
      ]);

      const result = await service.getUserPreferences(USER);

      expect(result.preferences.map(g => g.id).sort()).toEqual([4, 9]);
    });

    it('gives a user without any genre the default one and saves it', async () => {
      const { service, getUserGenres } = build();

      const result = await service.getUserPreferences(USER);

      expect(result.preferences).toEqual([{ id: 4, name: 'Adventure' }]);
      expect(getUserGenres()).toEqual([{ userId: USER, genreId: 4 }]);
    });
  });
});
