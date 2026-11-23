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
- [ ] Frontend: decide SSR vs static build (static + S3 + CloudFront is simplest)

## Stage 2 – Cognito (main feature)

- [x] User Pool with Google and Facebook federation (stack `CinemateAuth` deployed to eu-central-1, see `infra/README.md`)
- [x] Deploy the stack, set the `COGNITO_*` variables and click through the login
- [x] Backend: Passport/JWT replaced by Cognito (hosted UI + code flow, ID token verified with `aws-jwt-verify`); users keep their ids, no migration
- [x] Frontend: no change needed (the backend handles the flow and the cookie stays)

## Stage 3 – hosting on AWS

- [ ] Frontend: S3 + CloudFront (ACM / Route 53 if custom domain)
- [ ] Backend: Lambda + API Gateway or a container (App Runner / ECS); Neon via pooler; secrets in Secrets Manager / SSM

## Stage 4 – CI/CD and observability

- [ ] GitHub Actions: build, test, deploy infra and apps (OIDC to AWS, no stored keys)
- [ ] CloudWatch: logs, error alarm, one dashboard

## Stage 5 – optional

- [ ] SQS/SNS notifications for a new match, only if the app has a real event for it

## Stage 6 – portfolio

- [ ] README with architecture diagram
- [ ] Portfolio text only for what is deployed

## Decisions

Record architecture decisions in `docs/adr/` (one short file per decision, with the reason).
