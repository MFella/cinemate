# Cinemate – AWS plan

Goal: show real AWS skills (after DVA-C02) on this project. Only list on the portfolio what is actually deployed.

## Stage 0 – finish the dependency migration

- [x] Dependencies migrated (Nx 24, Angular 22.2, Nest 11, Express 5, Prisma 6, Node 24)
- [x] Database moved from Supabase to Neon
- [x] `main` pushed
- [ ] Click through the app locally with login (Google/Facebook)
- [x] Fix CI: real Nx targets (`lint`, `test`, `build`) for `frontend` and `backend`, plus `format:check`; pre-existing lint errors and failing frontend specs fixed
- [ ] CI: add the `*-e2e` projects back (backend-e2e needs a database and a running server and has import-boundary lint errors; frontend-e2e has Playwright tests with missing `await`, so they assert nothing)
- [ ] Re-enable the demo button in the portfolio (`technical-info.tsx`) once the demo works

## Stage 1 – foundation

- [x] IaC: CDK in TypeScript, `infra/` directory (see `docs/adr/0001-infrastructure-as-code-with-cdk.md`)
- [x] Frontend: static build (`nx build frontend -c static`), served from S3 + CloudFront

## Stage 2 – Cognito (main feature)

- [x] User Pool with Google and Facebook federation (stack `CinemateAuth` deployed to eu-central-1, see `infra/README.md`)
- [x] Deploy the stack, set the `COGNITO_*` variables and click through the login
- [x] Backend: Passport/JWT replaced by Cognito (hosted UI + code flow, ID token verified with `aws-jwt-verify`); users keep their ids, no migration
- [x] Frontend: no change needed (the backend handles the flow and the cookie stays)

## Stage 3 – hosting on AWS

- [x] Frontend: private S3 bucket + CloudFront (OAC); no custom domain, the `*.cloudfront.net` address is enough
- [x] Backend: the Nest app as one Lambda behind an HTTP API, reached through CloudFront at `/api/*` (same origin, so cookies work); Neon via the pooler; secrets in Secrets Manager (`cinemate/backend`)
- [x] Public demo enabled in production, with a throttled `POST /api/auth/demo` route

## Stage 4 – CI/CD and observability

- [x] GitHub Actions: CI on pull requests and `main`; Deploy after a green CI on `main` (OIDC to AWS, no stored keys)
- [x] CloudWatch: Lambda and API alarms, one dashboard, e-mail through SNS; AWS Budgets alert (5 USD / month)
- [ ] DB migrations are not part of the pipeline; `CinemateAuth`, `CinemateGithubDeploy` and `CinemateMonitoring` are deployed by hand

## Stage 5 – optional

- [ ] SQS/SNS notifications for a new match, only if the app has a real event for it

## Stage 6 – portfolio

- [x] README with architecture diagram
- [ ] Portfolio text only for what is deployed

## Decisions

Record architecture decisions in `docs/adr/` (one short file per decision, with the reason).
