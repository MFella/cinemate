# Cinemate – AWS plan

Goal: show real AWS skills (after DVA-C02) on this project. Only list on the portfolio what is actually deployed.

## Stage 0 – finish the dependency migration
- [x] Dependencies migrated (Nx 24, Angular 22.2, Nest 11, Express 5, Prisma 6, Node 24)
- [x] Database moved from Supabase to Neon
- [x] `main` pushed
- [ ] Click through the app locally with login (Google/Facebook)
- [ ] Fix CI: use real Nx targets (`lint`, `test`, `build`) instead of the npm script names; decide what to do with lint errors that existed before
- [ ] Re-enable the demo button in the portfolio (`technical-info.tsx`) once the demo works

## Stage 1 – foundation
- [ ] IaC: CDK in TypeScript (alternative: SAM), `infra/` directory
- [ ] Frontend: decide SSR vs static build (static + S3 + CloudFront is simplest)

## Stage 2 – Cognito (main feature)
- [ ] User Pool with Google and Facebook federation
- [ ] Backend: replace Passport/JWT with Cognito token validation (`jwks-rsa`), remap users in Prisma
- [ ] Frontend: Cognito login (Hosted UI or Amplify Auth), update guards and interceptor

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
