import { UserService } from '../app/user/user.service';
import { PrismaService } from '../app/database/prisma.service';

type DbUser = { id: number; email: string; genreId: number; picture: string };
type DbRate = { id: string; userId: number; movieId: number; value: string };
type DbMovie = {
  id: string;
  movieId: number;
  title: string;
  genreIds: Array<number>;
};

const ME = { id: 1, email: 'me@example.com', genreId: 4, picture: '' };
const ANNA = { id: 2, email: 'anna@example.com', genreId: 4, picture: '' };
const BOB = { id: 3, email: 'bob@example.com', genreId: 4, picture: '' };

const GENRE_ACTION = 4;
const GENRE_COMEDY = 7;

const movie = (
  movieId: number,
  title: string,
  genreIds = [GENRE_ACTION]
): DbMovie => ({ id: `m-${movieId}`, movieId, title, genreIds });

const rate = (userId: number, movieId: number, value: string): DbRate => ({
  id: `r-${userId}-${movieId}`,
  userId,
  movieId,
  value,
});

const yes = (userId: number, movieId: number): DbRate =>
  rate(userId, movieId, 'YES');

type InFilter = { in?: Array<unknown>; notIn?: Array<unknown> };
type EmailCondition = { email: { equals: string; mode?: string } };

// In-memory stand-in for the parts of Prisma used by getUserMatch. It applies the
// `where` filters, so the tests check what the service really asks the database for.
const createPrismaMock = (data: {
  users: Array<DbUser>;
  movies: Array<DbMovie>;
  rates: Array<DbRate>;
  watched?: Array<number>;
}) => {
  const matchesIn = (value: unknown, filter?: InFilter | unknown): boolean => {
    if (filter === undefined) return true;
    // a plain value is an equality filter
    if (typeof filter !== 'object' || filter === null) {
      return String(value) === String(filter);
    }
    return matchesInFilter(value, filter as InFilter);
  };

  const matchesInFilter = (value: unknown, filter: InFilter): boolean => {
    if (filter.in && !filter.in.map(String).includes(String(value))) {
      return false;
    }
    if (filter.notIn && filter.notIn.map(String).includes(String(value))) {
      return false;
    }
    return true;
  };

  return {
    user: {
      findMany: jest.fn(async ({ where }) =>
        data.users.filter(user =>
          (where.OR as Array<EmailCondition>).some(
            condition =>
              user.email.toLowerCase() === condition.email.equals.toLowerCase()
          )
        )
      ),
    },
    watchedMovie: {
      findMany: jest.fn(async () =>
        (data.watched ?? []).map(movieId => ({ movieId }))
      ),
    },
    movieToRate: {
      findMany: jest.fn(async ({ where }) =>
        data.movies.filter(
          m =>
            (where.genreIds?.has === undefined ||
              m.genreIds.includes(where.genreIds.has)) &&
            matchesIn(m.movieId, where.movieId) &&
            m.title
              .toLowerCase()
              .includes((where.title?.contains ?? '').toLowerCase())
        )
      ),
    },
    rate: {
      findMany: jest.fn(async ({ where }) =>
        data.rates.filter(
          r =>
            matchesIn(r.userId, where.userId) &&
            matchesIn(r.movieId, where.movieId) &&
            (where.value === undefined || r.value === where.value)
        )
      ),
    },
  };
};

describe('UserService.getUserMatch (common likes)', () => {
  const build = (data: Parameters<typeof createPrismaMock>[0]) => {
    const prisma = createPrismaMock(data);
    const service = new UserService(prisma as unknown as PrismaService);
    return { prisma, service };
  };

  const movies = [
    movie(10, 'Alpha'),
    movie(20, 'Bravo'),
    movie(30, 'Charlie'),
    movie(40, 'Delta'),
  ];

  const titlesOf = (result: {
    matchedRates: Array<{ movie: { title: string } }>;
  }) => result.matchedRates.map(r => r.movie.title);

  describe('mode "all" (default)', () => {
    it('returns only movies liked by me and every selected user', async () => {
      const { service } = build({
        users: [ME, ANNA, BOB],
        movies,
        rates: [
          // everyone liked Alpha
          yes(ME.id, 10),
          yes(ANNA.id, 10),
          yes(BOB.id, 10),
          // Bob did not like Bravo
          yes(ME.id, 20),
          yes(ANNA.id, 20),
          // I did not like Charlie
          yes(ANNA.id, 30),
          yes(BOB.id, 30),
        ],
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ANNA.email, BOB.email],
        0
      );

      expect(titlesOf(result)).toEqual(['Alpha']);
    });

    it('works with a single friend', async () => {
      const { service } = build({
        users: [ME, ANNA],
        movies,
        rates: [yes(ME.id, 10), yes(ANNA.id, 10), yes(ME.id, 20)],
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ANNA.email],
        0
      );

      expect(titlesOf(result)).toEqual(['Alpha']);
    });

    it('does not show a movie when I did not like it, even if all friends did', async () => {
      const { service } = build({
        users: [ME, ANNA, BOB],
        movies,
        rates: [yes(ANNA.id, 10), yes(BOB.id, 10), rate(ME.id, 10, 'NO')],
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ANNA.email, BOB.email],
        0
      );

      expect(result.matchedRates).toEqual([]);
    });

    it('counts only YES rates (IDK and NO do not match)', async () => {
      const { service } = build({
        users: [ME, ANNA],
        movies,
        rates: [
          yes(ME.id, 10),
          rate(ANNA.id, 10, 'IDK'),
          yes(ME.id, 20),
          rate(ANNA.id, 20, 'NO'),
        ],
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ANNA.email],
        0
      );

      expect(result.matchedRates).toEqual([]);
    });

    it('lists the friends who liked the movie (not me) in "users"', async () => {
      const { service } = build({
        users: [ME, ANNA, BOB],
        movies,
        rates: [yes(ME.id, 10), yes(ANNA.id, 10), yes(BOB.id, 10)],
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ANNA.email, BOB.email],
        0
      );

      expect(result.matchedRates[0].users.map(u => u.email).sort()).toEqual([
        ANNA.email,
        BOB.email,
      ]);
    });

    it('returns each movie once, with the movie id as the entry id', async () => {
      const { service } = build({
        users: [ME, ANNA, BOB],
        movies,
        rates: [yes(ME.id, 10), yes(ANNA.id, 10), yes(BOB.id, 10)],
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ANNA.email, BOB.email],
        0
      );

      expect(result.matchedRates).toHaveLength(1);
      expect(result.matchedRates[0].id).toBe(10);
      expect(result.matchedRateValue).toBe('YES');
    });
  });

  describe('mode "any"', () => {
    it('returns movies I liked that at least one selected user liked too', async () => {
      const { service } = build({
        users: [ME, ANNA, BOB],
        movies,
        rates: [
          // Anna only
          yes(ME.id, 10),
          yes(ANNA.id, 10),
          // Bob only
          yes(ME.id, 20),
          yes(BOB.id, 20),
          // only me
          yes(ME.id, 30),
          // only friends
          yes(ANNA.id, 40),
          yes(BOB.id, 40),
        ],
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ANNA.email, BOB.email],
        0,
        undefined,
        undefined,
        undefined,
        'any'
      );

      expect(titlesOf(result)).toEqual(['Alpha', 'Bravo']);
    });

    it('still requires me to have liked the movie', async () => {
      const { service } = build({
        users: [ME, ANNA],
        movies,
        rates: [yes(ANNA.id, 10)],
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ANNA.email],
        0,
        undefined,
        undefined,
        undefined,
        'any'
      );

      expect(result.matchedRates).toEqual([]);
    });
  });

  describe('selected users', () => {
    it('ignores empty entries sent by the frontend', async () => {
      const { service } = build({
        users: [ME, ANNA],
        movies,
        rates: [yes(ME.id, 10), yes(ANNA.id, 10)],
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        ['', ANNA.email],
        0
      );

      expect(titlesOf(result)).toEqual(['Alpha']);
      expect(result.unknownEmails).toEqual([]);
    });

    it('does not treat my own e-mail as a friend', async () => {
      const { service } = build({
        users: [ME, ANNA],
        movies,
        rates: [yes(ME.id, 10), yes(ANNA.id, 10)],
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ME.email, ANNA.email],
        0
      );

      expect(titlesOf(result)).toEqual(['Alpha']);
      expect(result.matchedRates[0].users.map(u => u.email)).toEqual([
        ANNA.email,
      ]);
    });

    it('returns nothing when only my own e-mail is given', async () => {
      const { service } = build({
        users: [ME],
        movies,
        rates: [yes(ME.id, 10)],
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ME.email],
        0
      );

      expect(result.matchedRates).toEqual([]);
    });

    it('matches e-mails case-insensitively', async () => {
      const { service } = build({
        users: [ME, ANNA],
        movies,
        rates: [yes(ME.id, 10), yes(ANNA.id, 10)],
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        ['ANNA@Example.com'],
        0
      );

      expect(titlesOf(result)).toEqual(['Alpha']);
      expect(result.unknownEmails).toEqual([]);
    });

    it('mode "all": an unknown e-mail means no common movies and is reported', async () => {
      const { service } = build({
        users: [ME, ANNA],
        movies,
        rates: [yes(ME.id, 10), yes(ANNA.id, 10)],
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ANNA.email, 'ghost@example.com'],
        0
      );

      expect(result.matchedRates).toEqual([]);
      expect(result.unknownEmails).toEqual(['ghost@example.com']);
    });

    it('mode "any": an unknown e-mail is reported but known users still match', async () => {
      const { service } = build({
        users: [ME, ANNA],
        movies,
        rates: [yes(ME.id, 10), yes(ANNA.id, 10)],
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ANNA.email, 'ghost@example.com'],
        0,
        undefined,
        undefined,
        undefined,
        'any'
      );

      expect(titlesOf(result)).toEqual(['Alpha']);
      expect(result.unknownEmails).toEqual(['ghost@example.com']);
    });

    it('returns nothing when no selected user exists', async () => {
      const { service } = build({
        users: [ME],
        movies,
        rates: [yes(ME.id, 10)],
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        ['ghost@example.com'],
        0
      );

      expect(result.matchedRates).toEqual([]);
      expect(result.unknownEmails).toEqual(['ghost@example.com']);
    });
  });

  describe('filters', () => {
    const shared = [
      movie(10, 'Alpha'),
      movie(20, 'Bravo'),
      movie(30, 'Funny one', [GENRE_COMEDY]),
    ];
    const sharedRates = [10, 20, 30].flatMap(movieId => [
      yes(ME.id, movieId),
      yes(ANNA.id, movieId),
    ]);

    it('only returns movies of the selected genre', async () => {
      const { service } = build({
        users: [ME, ANNA],
        movies: shared,
        rates: sharedRates,
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_COMEDY,
        [ANNA.email],
        0
      );

      expect(titlesOf(result)).toEqual(['Funny one']);
    });

    it('filters by (part of) the title', async () => {
      const { service } = build({
        users: [ME, ANNA],
        movies: shared,
        rates: sharedRates,
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ANNA.email],
        0,
        undefined,
        undefined,
        'brav'
      );

      expect(titlesOf(result)).toEqual(['Bravo']);
    });

    it('marks movies I watched and can show only watched ones', async () => {
      const { service } = build({
        users: [ME, ANNA],
        movies: shared,
        rates: sharedRates,
        watched: [10],
      });

      const all = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ANNA.email],
        0
      );
      const onlyWatched = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ANNA.email],
        0,
        undefined,
        true
      );

      expect(all.matchedRates.map(r => [r.movie.title, r.isWatched])).toEqual([
        ['Alpha', true],
        ['Bravo', false],
      ]);
      expect(titlesOf(onlyWatched)).toEqual(['Alpha']);
    });

    it('can show only unwatched movies', async () => {
      const { service } = build({
        users: [ME, ANNA],
        movies: shared,
        rates: sharedRates,
        watched: [10],
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ANNA.email],
        0,
        true
      );

      expect(titlesOf(result)).toEqual(['Bravo']);
    });

    it('does not filter by watched state when both flags are the same', async () => {
      const { service } = build({
        users: [ME, ANNA],
        movies: shared,
        rates: sharedRates,
        watched: [10],
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ANNA.email],
        0,
        true,
        true
      );

      expect(titlesOf(result)).toEqual(['Alpha', 'Bravo']);
    });
  });

  describe('pagination', () => {
    const manyMovies = Array.from({ length: 20 }, (_, i) =>
      movie(100 + i, `Movie ${String(i).padStart(2, '0')}`)
    );
    const manyRates = manyMovies.flatMap(m => [
      yes(ME.id, m.movieId),
      yes(ANNA.id, m.movieId),
    ]);

    it('returns 15 movies per page in a stable order', async () => {
      const { service } = build({
        users: [ME, ANNA],
        movies: manyMovies,
        rates: manyRates,
      });

      const first = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ANNA.email],
        0
      );
      const second = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ANNA.email],
        1
      );

      expect(first.matchedRates).toHaveLength(15);
      expect(first.isLastPage).toBe(false);
      expect(second.matchedRates).toHaveLength(5);
      expect(second.isLastPage).toBe(true);
      expect(titlesOf(first)[0]).toBe('Movie 00');
      expect(titlesOf(second)[0]).toBe('Movie 15');
    });

    it('marks the only page as last', async () => {
      const { service } = build({
        users: [ME, ANNA],
        movies: manyMovies.slice(0, 3),
        rates: manyRates,
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ANNA.email],
        0
      );

      expect(result.isLastPage).toBe(true);
    });

    it('returns an empty last page when there are no matches', async () => {
      const { service } = build({
        users: [ME, ANNA],
        movies: manyMovies,
        rates: [],
      });

      const result = await service.getUserMatch(
        ME.id,
        GENRE_ACTION,
        [ANNA.email],
        0
      );

      expect(result).toMatchObject({ matchedRates: [], isLastPage: true });
    });
  });
});
