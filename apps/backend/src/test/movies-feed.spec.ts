import { MoviesService } from '../app/movies/movies.service';
import { PrismaService } from '../app/database/prisma.service';
import { BaseRestDataService } from '../app/common/base-rest-data.service';
import { Rate } from '../app/dtos/rate-of-movie';

type Json = Record<string, unknown>;
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const GENRES = [
  { id: 4, name: 'Adventure' },
  { id: 7, name: 'Comedy' },
];

const tmdbMovie = (id: number, genreIds: Array<number>) => ({
  id,
  genre_ids: genreIds,
  poster_path: `/poster-${id}.jpg`,
  release_date: '2025-01-01',
  title: `Movie ${id}`,
  overview: `About ${id}`,
  vote_average: 7.5,
});

// In-memory database with just the tables and queries the feed uses.
const createDatabase = (userGenres: Array<{ userId: string; genreId: number }>) => {
  const pages: Array<Row> = [];
  const completed: Array<Row> = [];
  const rates: Array<Row> = [];
  const movies: Array<Row> = [];
  let genres: Array<Row> = [...GENRES];
  let nextId = 1;

  const inFilter = (value: unknown, filter: unknown): boolean =>
    filter !== null && typeof filter === 'object' && 'in' in (filter as Json)
      ? ((filter as { in: Array<unknown> }).in ?? []).includes(value)
      : value === filter;

  const pageMatches = (page: Row, where: Json = {}): boolean =>
    Object.entries(where).every(
      ([key, value]) => value === undefined || inFilter(page[key], value)
    );

  const completedWithPage = (c: Row): Row => ({
    ...c,
    pageOfMovie: pages.find(p => p.id === c.pageOfMovieId),
  });

  const prisma = {
    userGenre: {
      findMany: jest.fn(async ({ where }: { where: Json }) =>
        userGenres.filter(ug => ug.userId === where['userId'])
      ),
    },
    genre: {
      findMany: jest.fn(async (args?: { where?: Json; select?: Json }) =>
        genres.filter(g => pageMatches(g, args?.where))
      ),
      findFirst: jest.fn(async ({ where }: { where: Json }) =>
        genres.find(g => pageMatches(g, where)) ?? null
      ),
      createMany: jest.fn(async ({ data }: { data: Array<Row> }) => {
        genres = [...genres, ...data];
        return { count: data.length };
      }),
    },
    pageOfMovie: {
      findFirst: jest.fn(async ({ where }: { where: Json }) => {
        const has = (where['movieIds'] as { has?: number } | undefined)?.has;
        return (
          pages.find(
            p =>
              pageMatches(p, { ...where, movieIds: undefined }) &&
              (has === undefined || p.movieIds.includes(has))
          ) ?? null
        );
      }),
      create: jest.fn(async ({ data }: { data: Row }) => {
        const page = { id: `page-${nextId++}`, ...data };
        pages.push(page);
        return page;
      }),
    },
    completedPageOfMovie: {
      count: jest.fn(async ({ where }: { where: Row }) =>
        completed
          .map(completedWithPage)
          .filter(
            c =>
              c.userId === where['userId'] &&
              (where['pageOfMovieId'] === undefined ||
                c.pageOfMovieId === where['pageOfMovieId']) &&
              (where['pageOfMovie'] === undefined ||
                pageMatches(c.pageOfMovie, where['pageOfMovie']))
          ).length
      ),
      findMany: jest.fn(async ({ where }: { where: Row }) =>
        completed
          .map(completedWithPage)
          .filter(
            c =>
              c.userId === where['userId'] &&
              (where['pageOfMovie'] === undefined ||
                pageMatches(c.pageOfMovie, where['pageOfMovie']))
          )
      ),
      upsert: jest.fn(
        async ({ create }: { create: { userId: string; pageOfMovieId: string } }) => {
          if (
            !completed.some(
              c =>
                c.userId === create.userId &&
                c.pageOfMovieId === create.pageOfMovieId
            )
          ) {
            completed.push({ ...create });
          }
          return create;
        }
      ),
    },
    rate: {
      findMany: jest.fn(async ({ where }: { where: Json }) =>
        rates.filter(r => r.userId === where['userId'])
      ),
      upsert: jest.fn(
        async ({
          create,
        }: {
          create: { userId: string; movieId: number; value: string };
        }) => {
          const existing = rates.find(
            r => r.userId === create.userId && r.movieId === create.movieId
          );
          if (existing) {
            existing.value = create.value;
          } else {
            rates.push({ ...create });
          }
          return create;
        }
      ),
    },
    movieToRate: {
      findMany: jest.fn(async ({ where }: { where: Json }) =>
        movies.filter(m => pageMatches(m, where))
      ),
      count: jest.fn(
        async ({ where }: { where: Json }) =>
          movies.filter(m => pageMatches(m, where)).length
      ),
      createMany: jest.fn(async ({ data }: { data: Array<Row> }) => {
        movies.push(...data);
        return { count: data.length };
      }),
    },
  };

  return { prisma, pages, completed, movies };
};

describe('MoviesService feed (getMoviesData)', () => {
  const USER = '1001';
  const OTHER_USER = '2002';

  const setup = (
    options: {
      userGenres?: Array<number>;
      // TMDB answers by "genreId:pageNumber"
      tmdb?: Record<string, Array<ReturnType<typeof tmdbMovie>>>;
    } = {}
  ) => {
    const preferred = options.userGenres ?? [4];
    const database = createDatabase(
      [USER, OTHER_USER].flatMap(userId =>
        preferred.map(genreId => ({ userId, genreId }))
      )
    );
    const tmdb = options.tmdb ?? {
      '4:1': [tmdbMovie(1, [4]), tmdbMovie(2, [4]), tmdbMovie(3, [4, 7])],
      '4:2': [tmdbMovie(11, [4]), tmdbMovie(12, [4])],
      '7:1': [tmdbMovie(21, [7]), tmdbMovie(22, [7])],
    };
    const tmdbGet = jest.fn(
      async (
        _path: string,
        params: { genreId: number; pageNumber: number }
      ) => ({
        data: { results: tmdb[`${params.genreId}:${params.pageNumber}`] ?? [] },
      })
    );
    const service = new MoviesService(
      { get: tmdbGet } as unknown as BaseRestDataService,
      database.prisma as unknown as PrismaService
    );
    return { service, tmdbGet, ...database };
  };

  const idsOf = (dto: { movies: Array<{ id: number }> }) =>
    dto.movies.map(m => m.id);

  const rateAll = async (
    service: MoviesService,
    userId: string,
    movieIds: Array<number>
  ) => {
    for (const movieId of movieIds) {
      await service.rateMovie(movieId, Rate.YES, userId);
    }
  };

  it('fetches page 1 of the preferred genre from TMDB for a new user', async () => {
    const { service, tmdbGet } = setup();

    const result = await service.getMoviesData(USER, 0);

    expect(tmdbGet).toHaveBeenCalledTimes(1);
    expect(tmdbGet).toHaveBeenCalledWith('movies', { genreId: 4, pageNumber: 1 });
    expect(idsOf(result)).toEqual([1, 2, 3]);
    expect(result.selectedGenreId).toBe(4);
    expect(result.pageNumber).toBe(1);
  });

  it('saves the fetched page and its movies for everyone to reuse', async () => {
    const { service, pages, movies } = setup();

    await service.getMoviesData(USER, 0);

    expect(pages).toEqual([
      expect.objectContaining({ genreId: 4, pageNumber: 1, movieIds: [1, 2, 3] }),
    ]);
    expect(movies.map(m => m.movieId)).toEqual([1, 2, 3]);
  });

  it('serves the same page from the database on the next call (no TMDB request)', async () => {
    const { service, tmdbGet } = setup();
    await service.getMoviesData(USER, 0);

    const result = await service.getMoviesData(USER, 0);

    expect(tmdbGet).toHaveBeenCalledTimes(1);
    expect(idsOf(result)).toEqual([1, 2, 3]);
  });

  it('returns only the movies the user has not rated yet', async () => {
    const { service } = setup();
    await service.getMoviesData(USER, 0);
    await rateAll(service, USER, [1]);

    const result = await service.getMoviesData(USER, 0);

    expect(idsOf(result)).toEqual([2, 3]);
  });

  it('moves to the next TMDB page once the user rated the whole page', async () => {
    const { service, tmdbGet } = setup();
    await service.getMoviesData(USER, 0);
    await rateAll(service, USER, [1, 2, 3]);

    const result = await service.getMoviesData(USER, 0);

    expect(tmdbGet).toHaveBeenLastCalledWith('movies', {
      genreId: 4,
      pageNumber: 2,
    });
    expect(idsOf(result)).toEqual([11, 12]);
    expect(result.pageNumber).toBe(2);
  });

  it('shares fetched pages: another user gets the saved page without a TMDB request', async () => {
    const { service, tmdbGet } = setup();
    await service.getMoviesData(USER, 0);
    await rateAll(service, USER, [1, 2, 3]);
    tmdbGet.mockClear();

    const result = await service.getMoviesData(OTHER_USER, 0);

    expect(tmdbGet).not.toHaveBeenCalled();
    expect(idsOf(result)).toEqual([1, 2, 3]);
  });

  it("another user's progress does not skip pages for me", async () => {
    const { service } = setup();
    await service.getMoviesData(USER, 0);
    await rateAll(service, USER, [1, 2, 3]);

    const mine = await service.getMoviesData(OTHER_USER, 0);

    expect(mine.pageNumber).toBe(1);
  });

  it('shouldLoadNextPage = 1 asks for the page after the current one', async () => {
    const { service, tmdbGet } = setup();

    const result = await service.getMoviesData(USER, 1);

    expect(tmdbGet).toHaveBeenCalledWith('movies', { genreId: 4, pageNumber: 2 });
    expect(idsOf(result)).toEqual([11, 12]);
  });

  it('after finishing a page of one genre the feed continues with the next preferred genre', async () => {
    const { service, tmdbGet } = setup({ userGenres: [4, 7] });
    await service.getMoviesData(USER, 0);
    await rateAll(service, USER, [1, 2, 3]);

    const result = await service.getMoviesData(USER, 0);

    expect(tmdbGet).toHaveBeenLastCalledWith('movies', {
      genreId: 7,
      pageNumber: 1,
    });
    expect(idsOf(result)).toEqual([21, 22]);
    expect(result.selectedGenreId).toBe(7);
  });

  it('stays on the genre of an unfinished page', async () => {
    const { service } = setup({ userGenres: [4, 7] });
    await service.getMoviesData(USER, 0);
    await rateAll(service, USER, [1]);

    const result = await service.getMoviesData(USER, 0);

    expect(result.selectedGenreId).toBe(4);
    expect(idsOf(result)).toEqual([2, 3]);
  });

  it('skips a saved page whose movies the user already rated and continues with the next one', async () => {
    const { service, tmdbGet, completed } = setup();
    // the user rated these movies before anyone fetched the page
    await rateAll(service, OTHER_USER, [1, 2, 3]);
    await service.getMoviesData(USER, 0);
    tmdbGet.mockClear();

    const result = await service.getMoviesData(OTHER_USER, 0);

    expect(tmdbGet).toHaveBeenCalledWith('movies', { genreId: 4, pageNumber: 2 });
    expect(idsOf(result)).toEqual([11, 12]);
    expect(result.pageNumber).toBe(2);
    expect(completed).toEqual([expect.objectContaining({ userId: OTHER_USER })]);
  });

  it('returns an empty answer when TMDB has no results for the page', async () => {
    const { service } = setup({ tmdb: {} });

    const result = await service.getMoviesData(USER, 0);

    expect(result.movies).toEqual([]);
  });

  it('rating the last movie of a page keeps working after the refactor-sensitive path (rate then count)', async () => {
    const { service, completed } = setup();
    await service.getMoviesData(USER, 0);

    const lastRate = await (async () => {
      await rateAll(service, USER, [1, 2]);
      return service.rateMovie(3, Rate.NO, USER);
    })();

    expect(lastRate).toEqual({ moviesCountLeftOnPage: 0, isRateSaved: true });
    expect(completed).toHaveLength(1);
  });
});
