import { mockDeep } from 'jest-mock-extended';
import { MoviesService } from '../app/movies/movies.service';
import { PrismaService } from '../app/database/prisma.service';
import { BaseRestDataService } from '../app/common/base-rest-data.service';

// completed[genreId] = how many pages of that genre the user has finished
const createPrismaMock = (
  preferred: Array<number>,
  completed: Record<number, number>
) => ({
  userGenre: {
    findMany: jest.fn(async () =>
      preferred.map(genreId => ({ userId: '1001', genreId }))
    ),
  },
  completedPageOfMovie: {
    count: jest.fn(
      async (args: { where: { pageOfMovie: { genreId: number } } }) =>
        completed[args.where.pageOfMovie.genreId] ?? 0
    ),
  },
});

describe('MoviesService.getFeedGenreId', () => {
  const USER_ID = '1001';

  const build = (
    preferred: Array<number>,
    completed: Record<number, number> = {}
  ) =>
    new MoviesService(
      mockDeep<BaseRestDataService>(),
      createPrismaMock(preferred, completed) as unknown as PrismaService
    );

  it('serves the only preferred genre', async () => {
    expect(await build([7]).getFeedGenreId(USER_ID)).toBe(7);
  });

  it('starts with the lowest genre id when nothing is completed yet', async () => {
    expect(await build([9, 4, 7]).getFeedGenreId(USER_ID)).toBe(4);
  });

  it('moves on to the genre with the fewest completed pages', async () => {
    const service = build([4, 7, 9], { 4: 2, 7: 1, 9: 3 });

    expect(await service.getFeedGenreId(USER_ID)).toBe(7);
  });

  it('rotates evenly: ties go to the lowest genre id', async () => {
    const service = build([4, 7], { 4: 1, 7: 1 });

    expect(await service.getFeedGenreId(USER_ID)).toBe(4);
  });

  it('stays on the genre of an unfinished page (completions only change when a page is finished)', async () => {
    const service = build([4, 7], { 4: 1, 7: 2 });

    expect(await service.getFeedGenreId(USER_ID)).toBe(4);
    expect(await service.getFeedGenreId(USER_ID)).toBe(4);
  });

  it('falls back to the default genre when the user has no preferences', async () => {
    expect(await build([]).getFeedGenreId(USER_ID)).toBe(4);
  });
});
