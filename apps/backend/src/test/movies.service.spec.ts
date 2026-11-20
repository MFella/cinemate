import { mockDeep } from 'jest-mock-extended';
import { RateValue } from '@prisma/client';
import { MoviesService } from '../app/movies/movies.service';
import { PrismaService } from '../app/database/prisma.service';
import { BaseRestDataService } from '../app/common/base-rest-data.service';
import { Rate } from '../app/dtos/rate-of-movie';

// Only the Prisma methods MoviesService uses here. A deep mock of PrismaClient hits
// TypeScript's circular-type limits, so a small hand-written mock is used instead.
const createPrismaMock = () => ({
  userGenre: { findMany: jest.fn() },
  pageOfMovie: { findFirst: jest.fn() },
  rate: { findMany: jest.fn(), upsert: jest.fn(), create: jest.fn() },
  completedPageOfMovie: { count: jest.fn(), upsert: jest.fn() },
});

describe('MoviesService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let moviesService: MoviesService;

  const USER_ID = '1001';
  const OTHER_USER_ID = '2002';
  const GENRE_ID = 4;
  const PAGE = { id: 'page-1', pageNumber: 1, genreId: GENRE_ID, movieIds: [1, 2, 3] };

  // Rates the user already has in the database (after the rate being saved).
  const mockUserState = (ratedMovieIds: Array<number>) => {
    prisma.userGenre.findMany.mockResolvedValue([
      { userId: USER_ID, genreId: GENRE_ID },
    ]);
    prisma.pageOfMovie.findFirst.mockResolvedValue(PAGE );
    prisma.rate.findMany.mockResolvedValue(
      ratedMovieIds.map(movieId => ({
        id: `rate-${movieId}`,
        userId: USER_ID,
        movieId,
        value: RateValue.YES,
      }))
    );
    prisma.rate.upsert.mockResolvedValue({} );
    prisma.completedPageOfMovie.upsert.mockResolvedValue({} );
  };

  beforeEach(() => {
    prisma = createPrismaMock();
    moviesService = new MoviesService(
      mockDeep<BaseRestDataService>(),
      prisma as unknown as PrismaService
    );
  });

  describe('rateMovie', () => {
    it('saves the rate with an upsert keyed by user and movie', async () => {
      mockUserState([1]);

      const result = await moviesService.rateMovie(1, Rate.YES, USER_ID);

      expect(prisma.rate.upsert).toHaveBeenCalledWith({
        where: { userMovieRate: { userId: USER_ID, movieId: 1 } },
        create: { userId: USER_ID, movieId: 1, value: RateValue.YES },
        update: { value: RateValue.YES },
      });
      expect(result.isRateSaved).toBe(true);
    });

    it('lets the user change an existing vote instead of ignoring it', async () => {
      mockUserState([1]);

      await moviesService.rateMovie(1, Rate.YES, USER_ID);
      await moviesService.rateMovie(1, Rate.NO, USER_ID);

      expect(prisma.rate.upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          update: { value: RateValue.NO },
        })
      );
      expect(prisma.rate.create).not.toHaveBeenCalled();
    });

    it('reports how many movies are left on the page', async () => {
      mockUserState([1]);

      const result = await moviesService.rateMovie(1, Rate.YES, USER_ID);

      expect(result.moviesCountLeftOnPage).toBe(2);
      expect(prisma.completedPageOfMovie.upsert).not.toHaveBeenCalled();
    });

    it('marks the page as completed for this user when nothing is left', async () => {
      mockUserState([1, 2, 3]);

      const result = await moviesService.rateMovie(3, Rate.IDK, USER_ID);

      expect(result.moviesCountLeftOnPage).toBe(0);
      expect(prisma.completedPageOfMovie.upsert).toHaveBeenCalledWith({
        where: {
          userCompletedPage: { userId: USER_ID, pageOfMovieId: PAGE.id },
        },
        create: { userId: USER_ID, pageOfMovieId: PAGE.id },
        update: {},
      });
    });

    it('completes the page for this user even if another user already did', async () => {
      mockUserState([1, 2, 3]);
      // Another user finished this page earlier; it must not block this user.
      prisma.completedPageOfMovie.count.mockImplementation(
        async (args: { where: { userId?: string } }) =>
          args?.where?.userId === OTHER_USER_ID ? 1 : 0
      );

      await moviesService.rateMovie(3, Rate.NO, USER_ID);

      expect(prisma.completedPageOfMovie.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: { userId: USER_ID, pageOfMovieId: PAGE.id },
        })
      );
    });

    it('does not report the rate as saved when the database returns nothing', async () => {
      mockUserState([1]);
      prisma.rate.upsert.mockResolvedValue(null );

      const result = await moviesService.rateMovie(1, Rate.YES, USER_ID);

      expect(result).toEqual({
        moviesCountLeftOnPage: null,
        isRateSaved: false,
        reason: 'Failed saving rate into database',
      });
    });
  });

  describe('page completion is tracked per user', () => {
    beforeEach(() => {
      prisma.completedPageOfMovie.count.mockImplementation(
        async (args: { where: { userId?: string; pageOfMovieId?: string } }) =>
          args?.where?.userId === OTHER_USER_ID &&
          args?.where?.pageOfMovieId === PAGE.id
            ? 1
            : 0
      );
    });

    it('is completed for the user who finished the page', async () => {
      const isCompleted = await moviesService['isPageCompletedByUser'](
        OTHER_USER_ID,
        PAGE.id
      );

      expect(isCompleted).toBe(true);
    });

    it('is not completed for a different user', async () => {
      const isCompleted = await moviesService['isPageCompletedByUser'](
        USER_ID,
        PAGE.id
      );

      expect(isCompleted).toBe(false);
      expect(prisma.completedPageOfMovie.count).toHaveBeenCalledWith({
        where: { userId: USER_ID, pageOfMovieId: PAGE.id },
      });
    });

    it('serves cached movies of a page that only another user completed', async () => {
      const cachedList = {
        movies: [{ id: 1 }],
        selectedGenreId: GENRE_ID,
        pageGenres: [],
        pageNumber: 1,
      };
      jest
        .spyOn(moviesService as never, 'getTmdbMovieRequestOptions')
        .mockResolvedValue({ pageNumber: 1, genreId: GENRE_ID } as never);
      prisma.pageOfMovie.findFirst.mockResolvedValue(PAGE );
      jest
        .spyOn(moviesService, 'retrieveMovieListDtoFromDb')
        .mockResolvedValue(cachedList as never);

      const result = await moviesService.getMoviesData(USER_ID, 1);

      expect(result).toBe(cachedList);
    });
  });
});
