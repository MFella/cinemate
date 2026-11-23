import { UnauthorizedException } from '@nestjs/common';
import { FriendshipStatus, RateValue } from '@prisma/client';
import { AuthController } from '../app/auth/auth.controller';
import { SessionService } from '../app/auth/session.service';
import { buildDemoDataset } from '../app/demo/demo-dataset';
import { resetDemoData } from '../app/demo/demo-reset';
import { DemoService } from '../app/demo/demo.service';
import {
  DEMO_TOKEN_TTL_MS,
  DemoTokenService,
} from '../app/demo/demo-token.service';
import {
  ALL_DEMO_IDS,
  DEMO_FRIENDS,
  DEMO_PENDING_FRIEND,
  DEMO_USER,
  isDemoUserId,
} from '../app/demo/demo-users';
import { FriendsService } from '../app/friends/friends.service';

const GENRES = [{ id: 35 }, { id: 28 }, { id: 99 }];
// 14 comedies (ids 100-113), 13 action movies (200-212), 2 documentaries; movie 100 is both
const MOVIES = [
  ...Array.from({ length: 14 }, (_, i) => ({
    movieId: 100 + i,
    genreIds: i === 0 ? [35, 28] : [35],
  })),
  ...Array.from({ length: 13 }, (_, i) => ({
    movieId: 200 + i,
    genreIds: [28],
  })),
  { movieId: 300, genreIds: [99] },
  { movieId: 301, genreIds: [99] },
];

const tokens = (secret = 'secret') =>
  new DemoTokenService({ get: () => ({ tokenSecret: secret }) } as never);

describe('demo ids', () => {
  it('recognizes only the reserved range', () => {
    expect(ALL_DEMO_IDS).toHaveLength(6);
    ALL_DEMO_IDS.forEach(id => expect(isDemoUserId(id)).toBe(true));
    // a Google sub, a Facebook id and a short number
    expect(isDemoUserId('110248495921238986420')).toBe(false);
    expect(isDemoUserId('1234567890123456')).toBe(false);
    expect(isDemoUserId(5)).toBe(false);
  });
});

describe('buildDemoDataset', () => {
  const dataset = buildDemoDataset(GENRES, MOVIES);

  it('creates the demo user, four friends and one pending request', () => {
    expect(dataset.users.map(user => user.id)).toEqual(ALL_DEMO_IDS);
    const accepted = dataset.friendships.filter(
      f => f.status === FriendshipStatus.ACCEPTED
    );
    expect(accepted.map(f => f.requesterId)).toEqual(
      DEMO_FRIENDS.map(friend => friend.id)
    );
    expect(dataset.friendships).toContainEqual({
      requesterId: DEMO_PENDING_FRIEND.id,
      addresseeId: DEMO_USER.id,
      status: FriendshipStatus.PENDING,
    });
  });

  it('prefers the two genres with the most movies', () => {
    expect(dataset.userGenres).toEqual([
      // both have 12 movies after the cap: the lower id goes first
      { userId: DEMO_USER.id, genreId: 28 },
      { userId: DEMO_USER.id, genreId: 35 },
    ]);
  });

  it('rates only movies that exist and never twice', () => {
    const known = new Set(MOVIES.map(movie => movie.movieId));
    const keys = dataset.rates.map(rate => `${rate.userId}:${rate.movieId}`);

    expect(new Set(keys).size).toBe(keys.length);
    dataset.rates.forEach(rate => expect(known.has(rate.movieId)).toBe(true));
  });

  it('gives Find something in common for both match modes', () => {
    const liked = (userId: string) =>
      new Set(
        dataset.rates
          .filter(r => r.userId === userId && r.value === RateValue.YES)
          .map(r => r.movieId)
      );
    const anna = liked(DEMO_FRIENDS[0].id);
    const bob = liked(DEMO_FRIENDS[1].id);
    const mine = liked(DEMO_USER.id);

    const everyone = [...mine].filter(id => anna.has(id) && bob.has(id));
    const anyone = [...mine].filter(id => anna.has(id) || bob.has(id));

    expect(everyone.length).toBeGreaterThanOrEqual(4);
    expect(anyone.length).toBeGreaterThan(everyone.length);
  });

  it('marks some of the demo movies as watched', () => {
    expect(dataset.watchedMovies.length).toBeGreaterThan(0);
    dataset.watchedMovies.forEach(w => expect(w.userId).toBe(DEMO_USER.id));
  });

  it('is deterministic', () => {
    expect(buildDemoDataset(GENRES, [...MOVIES].reverse())).toEqual(dataset);
  });

  it('explains what is missing when the database has no movies', () => {
    expect(() => buildDemoDataset(GENRES, [])).toThrow(/needs movies/);
  });
});

describe('resetDemoData', () => {
  const build = (movies = MOVIES) => {
    const model = (name: string) =>
      new Proxy(
        {},
        {
          get: (_, method: string) =>
            jest.fn((args: unknown) => ({ name, method, args })),
        }
      );
    return {
      genre: { findMany: jest.fn().mockResolvedValue(GENRES) },
      movieToRate: { findMany: jest.fn().mockResolvedValue(movies) },
      rate: model('rate'),
      watchedMovie: model('watchedMovie'),
      completedPageOfMovie: model('completedPageOfMovie'),
      friendship: model('friendship'),
      userGenre: model('userGenre'),
      user: model('user'),
      $transaction: jest.fn().mockResolvedValue([]),
    };
  };

  it('deletes only the demo accounts data, then creates it again, in one transaction', async () => {
    const prisma = build();

    await resetDemoData(prisma as never);

    const operations = prisma.$transaction.mock.calls[0][0] as Array<{
      name: string;
      method: string;
      args: { where?: unknown };
    }>;
    const steps = operations.map(op => `${op.name}.${op.method}`);
    // everything is deleted before anything is created
    expect(steps.slice(0, 6).every(step => step.endsWith('.deleteMany'))).toBe(
      true
    );
    expect(steps.slice(6).every(step => step.endsWith('.createMany'))).toBe(
      true
    );
    // and every delete is limited to the demo ids
    for (const op of operations.slice(0, 6)) {
      expect(JSON.stringify(op.args.where)).toContain(DEMO_USER.id);
    }
  });

  it('deletes nothing when there are no movies to build the demo from', async () => {
    const prisma = build([]);

    await expect(resetDemoData(prisma as never)).rejects.toThrow(
      /needs movies/
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('DemoService (lazy reset)', () => {
  const HOUR = 60 * 60 * 1000;
  const build = (userExists = true) => {
    const anyModel = () => ({
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    });
    const prisma = {
      genre: { findMany: jest.fn().mockResolvedValue(GENRES) },
      movieToRate: { findMany: jest.fn().mockResolvedValue(MOVIES) },
      user: {
        ...anyModel(),
        findFirst: jest.fn().mockResolvedValue(userExists ? { id: 1 } : null),
      },
      rate: anyModel(),
      watchedMovie: anyModel(),
      completedPageOfMovie: anyModel(),
      friendship: anyModel(),
      userGenre: anyModel(),
      $transaction: jest.fn().mockResolvedValue([]),
    };
    const service = new DemoService(
      { get: () => ({ enabled: true, resetIntervalMs: HOUR }) } as never,
      prisma as never
    );
    return { prisma, service };
  };

  it('resets on the first sign-in', async () => {
    const { prisma, service } = build();

    await service.ensureFresh(1_000);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('does not reset again within the interval', async () => {
    const { prisma, service } = build();

    await service.ensureFresh(1_000);
    await service.ensureFresh(1_000 + HOUR - 1);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('resets again once the interval has passed', async () => {
    const { prisma, service } = build();

    await service.ensureFresh(1_000);
    await service.ensureFresh(1_000 + HOUR);

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('resets at once when the demo user has disappeared', async () => {
    const { prisma, service } = build(false);

    await service.ensureFresh(1_000);
    await service.ensureFresh(2_000);

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('shares one reset between simultaneous sign-ins', async () => {
    const { prisma, service } = build();

    await Promise.all([service.ensureFresh(1_000), service.ensureFresh(1_000)]);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('tries again after a failed reset', async () => {
    const { prisma, service } = build();
    prisma.$transaction.mockRejectedValueOnce(new Error('db down'));

    await expect(service.ensureFresh(1_000)).rejects.toThrow('db down');
    await service.ensureFresh(1_001);

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('reports whether it is enabled', () => {
    expect(build().service.isEnabled).toBe(true);
  });
});

describe('DemoTokenService', () => {
  it('accepts a token it issued', () => {
    const service = tokens();

    expect(service.verify(service.sign(1_000), 2_000)).toBe(true);
  });

  it('expires after two hours', () => {
    const service = tokens();
    const token = service.sign(0);

    expect(service.verify(token, DEMO_TOKEN_TTL_MS - 1)).toBe(true);
    expect(service.verify(token, DEMO_TOKEN_TTL_MS)).toBe(false);
  });

  it('rejects a token signed with another key', () => {
    expect(tokens('other').verify(tokens().sign())).toBe(false);
  });

  it('rejects a token with a prolonged expiry date', () => {
    const [prefix, , signature] = tokens().sign(0).split('.');

    expect(
      tokens().verify(`${prefix}.${Date.now() + 10 ** 12}.${signature}`)
    ).toBe(false);
  });

  it.each(['', 'demo', 'demo.1', 'demo.1.2.3', 'jwt.1.2', 'a.b.c'])(
    'rejects the malformed token "%s"',
    token => {
      expect(tokens().verify(token)).toBe(false);
    }
  );

  it('uses a random key per process when none is configured', () => {
    const first = tokens('');
    const second = tokens('');

    expect(second.verify(first.sign())).toBe(false);
  });

  it('tells demo tokens from Cognito tokens', () => {
    expect(DemoTokenService.isDemoToken('demo.1.abc')).toBe(true);
    expect(DemoTokenService.isDemoToken('eyJhbGciOi.payload.sig')).toBe(false);
  });
});

describe('SessionService', () => {
  const cognito = {
    verifyIdToken: jest.fn().mockResolvedValue({
      id: '1',
      email: 'a@b.c',
      picture: 'p',
      provider: 'google',
    }),
  };
  const build = (isEnabled: boolean) => {
    const service = tokens();
    return {
      service,
      session: new SessionService(cognito as never, service, {
        isEnabled,
      } as DemoService),
    };
  };

  it('opens the demo account with a valid demo token', async () => {
    const { session, service } = build(true);

    await expect(session.resolve(service.sign())).resolves.toEqual({
      id: DEMO_USER.id,
      email: DEMO_USER.email,
      picture: DEMO_USER.picture,
    });
  });

  it('refuses demo tokens when the demo is switched off', async () => {
    const { session, service } = build(false);

    await expect(session.resolve(service.sign())).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('refuses a forged demo token', async () => {
    const { session } = build(true);

    await expect(session.resolve('demo.99999999999999.forged')).rejects.toThrow(
      UnauthorizedException
    );
  });

  it('hands other tokens to Cognito', async () => {
    const { session } = build(true);

    const identity = await session.resolve('eyJ.real.token');

    expect(cognito.verifyIdToken).toHaveBeenCalledWith('eyJ.real.token');
    expect(identity.id).toBe('1');
  });
});

describe('AuthController demo endpoints', () => {
  const build = (isEnabled: boolean) => {
    const demoService = {
      isEnabled,
      ensureFresh: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DemoService>;
    const service = tokens();
    const controller = new AuthController(
      {} as never,
      {
        get: (key: string) =>
          ({ isDevMode: true, frontendUrl: 'http://localhost:4200' })[key],
      } as never,
      { getLogoutUrl: () => 'https://cognito/logout' } as never,
      new SessionService({} as never, service, demoService),
      demoService,
      service
    );
    return { controller, demoService, service };
  };

  it('reports whether the demo is on', () => {
    expect(build(true).controller.getOptions()).toEqual({ demo: true });
    expect(build(false).controller.getOptions()).toEqual({ demo: false });
  });

  it('refreshes the demo data and sets a demo session cookie', async () => {
    const { controller, demoService, service } = build(true);
    const response = { cookie: jest.fn() };

    await controller.startDemo(response);

    expect(demoService.ensureFresh).toHaveBeenCalled();
    const [name, token, options] = response.cookie.mock.calls[0];
    expect(name).toBe('access_token');
    expect(service.verify(token)).toBe(true);
    expect(options).toEqual(expect.objectContaining({ httpOnly: true }));
  });

  it('does not exist when the demo is off', async () => {
    const { controller, demoService } = build(false);
    const response = { cookie: jest.fn() };

    await expect(controller.startDemo(response)).rejects.toThrow('Not Found');
    expect(demoService.ensureFresh).not.toHaveBeenCalled();
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it('logs out of the demo back to the app, not through Cognito', async () => {
    const { controller, service } = build(true);

    const result = await controller.revokeToken(
      { cookies: { access_token: service.sign() } },
      { clearCookie: jest.fn() } as never
    );

    expect(result).toEqual({ logoutUrl: 'http://localhost:4200' });
  });
});

describe('FriendsService and the demo account', () => {
  const build = (target: { id: string; email: string } | null) => {
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue(target) },
      friendship: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    return { prisma, service: new FriendsService(prisma as never) };
  };

  it('does not let the demo user send a request to a real user', async () => {
    const { prisma, service } = build({
      id: '110248495921238986420',
      email: 'real@example.com',
    });

    await service.sendRequest(DEMO_USER.id, 'real@example.com');

    expect(prisma.friendship.create).not.toHaveBeenCalled();
  });

  it('lets a real user send a request to the demo user', async () => {
    const { prisma, service } = build({
      id: DEMO_USER.id,
      email: DEMO_USER.email,
    });

    await service.sendRequest('110248495921238986420', DEMO_USER.email);

    expect(prisma.friendship.create).toHaveBeenCalled();
  });
});
