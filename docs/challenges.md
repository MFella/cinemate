# Challenges along the way

Problems met while moving Cinemate to AWS, with the cause and the fix. Only things that actually happened.

## The Prisma engine on Lambda

- **Problem:** Prisma needs a native query engine (`.so.node`, a compiled Rust library). The one generated on a developer machine does not run on Lambda.
- **Cause:** the binary has to match the OS and the CPU architecture of the runtime (Amazon Linux, OpenSSL 3, x86_64). Webpack also cannot pull a binary into a single-file bundle, and Prisma looks for the engine next to the code.
- **Fix:** `binaryTargets = ["native", "rhel-openssl-3.0.x"]` in `schema.prisma`, `Architecture.X86_64` on the function, and a `CopyPlugin` entry that puts the engine and `schema.prisma` beside `main.js`. No layer and no container image: the whole bundle is 29 MB unpacked (the limit is 250 MB), 17 MB of it is the engine.

## Nest in one file

- **Problem:** the webpack build failed on modules that Nest loads only when they are installed, and produced several chunk files.
- **Fix:** `IgnorePlugin` for the optional Nest modules (`@nestjs/microservices`, `@nestjs/websockets`) and `LimitChunkCountPlugin` with one chunk.

## Secrets before configuration

- **Problem:** the database URL and other secrets live in Secrets Manager, but `ConfigModule.forRoot` reads `process.env` when its module is imported.
- **Fix:** the handler fetches the secret first, copies it into `process.env`, and only then does `await import('./app/app.module')`. The Nest app is created once per cold start and reused. Measured: about 1.3 s for a start locally, about 2.7 s for the first call on AWS.

## One origin for the browser

- **Problem:** a frontend and an API on different domains need CORS and cross-site cookies.
- **Fix:** CloudFront serves the static files from S3 and forwards `/api/*` to the HTTP API, so the browser talks to one origin and the session cookie stays first-party.

## Throttling a single route

- **Problem:** the public demo route can rebuild the demo data, so it must be rate limited. The first deploy failed, and the stack got stuck in `UPDATE_ROLLBACK_FAILED`.
- **Cause:** the stage `routeSettings` keys must be PascalCase (`ThrottlingRateLimit`), and the stage was created before the route it refers to.
- **Fix:** `continue-update-rollback --resources-to-skip` to unblock the stack, then PascalCase keys and an explicit dependency of the stage on the route. The limit (2 requests/s, burst 5) was checked live: a 429 response.

## Deploying without AWS keys

- **Problem:** a CI deploy normally needs long-lived access keys stored in GitHub.
- **Fix:** GitHub OIDC. The workflow trades a short-lived token for the role `cinemate-github-deploy`. The trust policy accepts one repository and one branch (`repo:MFella/cinemate:ref:refs/heads/main`), so pull requests and forks cannot deploy. The role itself can only assume the CDK bootstrap roles, which hold the real permissions. Those are broad by default, which is a known trade-off.

## A public demo that cannot hurt real data

- **Problem:** a one-click demo on a production database.
- **Fix:** a signed demo token, a reserved range of user ids that the demo code is allowed to write, a lazy reset of the demo data, the throttled route above, and a `DEMO_MODE` switch.
