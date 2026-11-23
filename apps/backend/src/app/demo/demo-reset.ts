import type { PrismaClient } from '@prisma/client';
import { buildDemoDataset } from './demo-dataset';
import { ALL_DEMO_IDS } from './demo-users';

/**
 * Throws away everything that belongs to the demo accounts and creates it again.
 * Only rows of the reserved demo ids are touched. Used by the seed script and by the
 * lazy reset of the backend.
 */
export const resetDemoData = async (prisma: PrismaClient): Promise<void> => {
  const [genres, movies] = await Promise.all([
    prisma.genre.findMany({ select: { id: true } }),
    prisma.movieToRate.findMany({ select: { movieId: true, genreIds: true } }),
  ]);
  // fails before anything is deleted when there is nothing to build the demo from
  const dataset = buildDemoDataset(genres, movies);

  const ofDemoUsers = { userId: { in: ALL_DEMO_IDS } };
  await prisma.$transaction([
    prisma.rate.deleteMany({ where: ofDemoUsers }),
    prisma.watchedMovie.deleteMany({ where: ofDemoUsers }),
    prisma.completedPageOfMovie.deleteMany({ where: ofDemoUsers }),
    prisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: { in: ALL_DEMO_IDS } },
          { addresseeId: { in: ALL_DEMO_IDS } },
        ],
      },
    }),
    prisma.userGenre.deleteMany({ where: ofDemoUsers }),
    prisma.user.deleteMany({ where: { id: { in: ALL_DEMO_IDS } } }),
    prisma.user.createMany({ data: dataset.users }),
    prisma.userGenre.createMany({ data: dataset.userGenres }),
    prisma.friendship.createMany({ data: dataset.friendships }),
    prisma.rate.createMany({ data: dataset.rates }),
    prisma.watchedMovie.createMany({ data: dataset.watchedMovies }),
  ]);
};
