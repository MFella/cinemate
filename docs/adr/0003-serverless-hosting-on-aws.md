# 3. Serverless hosting on AWS

## Status

Accepted

## Context

The goal is to show AWS integration skills at a cost close to zero. A custom domain costs money and adds nothing to that goal.

## Decision

- Frontend: static Angular build in a private S3 bucket behind CloudFront (origin access control).
- Backend: the Nest app as one Lambda (Node 22, x86_64) behind an HTTP API. CloudFront forwards `/api/*` to it, so the browser talks to one origin and the session cookie stays first-party.
- Secrets in Secrets Manager, read by the Lambda on a cold start. The database stays on Neon (pooled connection).
- Deploys from GitHub Actions through an OIDC role that can only assume the CDK bootstrap roles. No AWS keys are stored in GitHub.
- Alarms and a dashboard in CloudWatch, alerts through SNS (e-mail), plus an AWS Budgets alert.

## Consequences

- Cold start is about 1.5 to 3 s; acceptable for this app.
- No custom domain: the address is the `*.cloudfront.net` one.
- The CDK bootstrap roles are broad. A narrower custom deploy role is possible later.
- Database migrations are still run by hand.
