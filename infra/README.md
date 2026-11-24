# Cinemate infrastructure (AWS CDK)

| Stack                  | What it creates                                  | Deployed by                   |
| ---------------------- | ------------------------------------------------ | ----------------------------- |
| `CinemateBackend`      | Lambda (Nest), HTTP API, throttled demo route    | GitHub Actions                |
| `CinemateFrontend`     | S3 bucket, CloudFront (`/api/*` goes to the API) | GitHub Actions                |
| `CinemateAuth`         | Cognito user pool, hosted UI, app client         | by hand                       |
| `CinemateGithubDeploy` | GitHub OIDC provider and the deploy role         | by hand                       |
| `CinemateMonitoring`   | SNS topic, alarms, dashboard, monthly budget     | by hand (`-c alertEmail=...`) |

Why serverless: [`docs/adr/0003-serverless-hosting-on-aws.md`](../docs/adr/0003-serverless-hosting-on-aws.md). The backend secret is created with `node infra/scripts/put-backend-secret.js`.

Sign-in through Amazon Cognito. Why: [`docs/adr/0002-cognito-for-authentication.md`](../docs/adr/0002-cognito-for-authentication.md).

The stack `CinemateAuth` (region `eu-central-1`) creates a federation-only user pool (Google, Facebook), the hosted UI domain and one app client for the backend.

## Before the first deploy

1. **OAuth clients.** Create a Google OAuth client and a Facebook app. In both, register the redirect URI of the hosted UI:
   `https://<domainPrefix>.auth.eu-central-1.amazoncognito.com/oauth2/idpresponse`
   (`domainPrefix` defaults to `cinemate-auth`; the prefix must be unique in the region).
2. **Secrets.** Store each client in AWS Secrets Manager as JSON with the keys `clientId` and `clientSecret`:
   - `cinemate/google-oauth`
   - `cinemate/facebook-oauth`

   The stack only reads them (CloudFormation resolves them while deploying); nothing secret is in this repository.

3. AWS credentials for the target account (for example `aws configure sso`), and once per account and region: `npx cdk bootstrap`.

## Commands

```bash
npx nx test infra       # checks the generated template, no AWS needed
npx nx run infra:synth  # builds the CloudFormation template locally
npx nx run infra:deploy # creates the resources in your AWS account
```

Context values (`cdk deploy -c name=value`): `domainPrefix`, `productionCallbackUrl` (the deployed backend `.../api/auth/callback`), `productionLogoutUrl` (the deployed frontend URL). `localhost` URLs are always registered.

## After the deploy: backend configuration

The stack prints `UserPoolId`, `ClientId`, `Domain` and `Region`. The client secret is not printed; read it once and put it in your local `.env`:

```bash
aws cognito-idp describe-user-pool-client --region eu-central-1 \
  --user-pool-id <UserPoolId> --client-id <ClientId> \
  --query UserPoolClient.ClientSecret --output text
```

Backend environment variables (`apps/backend/.env`):

| Variable                | Value                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `COGNITO_REGION`        | `eu-central-1`                                                                       |
| `COGNITO_USER_POOL_ID`  | `UserPoolId` output                                                                  |
| `COGNITO_CLIENT_ID`     | `ClientId` output                                                                    |
| `COGNITO_CLIENT_SECRET` | the secret read above                                                                |
| `COGNITO_DOMAIN`        | `Domain` output, without `https://`                                                  |
| `COGNITO_REDIRECT_URI`  | `http://localhost:3000/api/auth/callback` locally (must be one of the callback URLs) |
| `FRONTEND_URL`          | `http://localhost:4200` locally (must be one of the sign-out URLs)                   |

The old `OAUTH_GOOGLE_*` and `AUTH_JWT_SECRET` variables are no longer used.

## Cost

A user pool is free up to 10,000 monthly active users (Cognito free tier); the hosted UI and federation add no charge at this size.
