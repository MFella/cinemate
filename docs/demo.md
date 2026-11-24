# Demo account

A shared demo account that lets anyone (a recruiter, a teammate) see how Cinemate works
without signing in with Google or Facebook. It has example friends, ratings and watched
movies, so Match, Friends and Find have something to show right away.

## What the demo contains

- the user `demo@demo.cinemate.app` with two preferred genres,
- four friends (Anna, Bob, Carla, Dan) and one pending request (Eva),
- ratings chosen so that **Find** returns results in both modes: with Anna and Bob,
  "everyone liked it" gives 4 movies and "at least one" gives more,
- three movies of the demo user marked as watched (for the "Only watched" filter).

The movies come from the database (`MovieToRate`), so the app has to have fetched some
movies before (open Match once on a fresh database). The data is built in
`apps/backend/src/app/demo/demo-dataset.ts` and is deterministic.

Demo accounts live in a reserved id range (20 digits starting with `9999999999`), so they
never clash with Google or Facebook ids and every reset touches only them.

## Turning it on

The demo is **off by default**. Set in `apps/backend/.env` (or the environment of the
deployed backend):

| Variable             | Meaning                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| `DEMO_MODE`          | `true` enables `POST /api/auth/demo` and the "Try the demo" button      |
| `DEMO_RESET_MINUTES` | how often the data is rebuilt (default `60`)                            |
| `DEMO_TOKEN_SECRET`  | key that signs demo sessions; optional, a random one is used if missing |

The login page asks the backend (`GET /api/auth/options`) and shows the button only when
the demo is on.

## Seeding by hand

```bash
npm run seed:demo
```

Rebuilds the demo accounts in the database from `apps/backend/.env`. It deletes and
creates only rows of the reserved demo ids. It fails without touching anything when the
database has no movies yet.

## Lazy reset

Nothing runs on a schedule. When someone clicks "Try the demo", the backend checks
whether the data is older than `DEMO_RESET_MINUTES` (or the demo user is missing) and
rebuilds it first. Simultaneous clicks share one reset. The time of the last reset is
kept in memory, so every backend instance resets at most once per interval and a restart
resets again.

A visitor who changes the demo data therefore only affects the people who come before the
next reset.

## How the session works

`POST /api/auth/demo` sets the same `access_token` cookie as the real sign-in, but with
a demo token: `demo.<expires at>.<HMAC-SHA256>`. It is valid for two hours and opens the
demo account only. The `AuthGuard` asks `SessionService`, which accepts demo tokens only
while `DEMO_MODE=true` and sends every other token to Cognito.

Limits of the demo account:

- friend requests from the demo user to real users are ignored (nothing is created),
- the sign-out of a demo session goes back to the app and does not touch Cognito.

## Before the demo goes public

- Rate limit `POST /api/auth/demo` (API Gateway throttling or similar). Each call can
  trigger a reset, at most once per interval, but it should not be an open door.
- The demo shares one account, so do not keep anything private in it.
