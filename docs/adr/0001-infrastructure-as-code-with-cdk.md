# 1. Infrastructure as code with AWS CDK (TypeScript)

Date: 2026-11-23

## Decision

AWS resources are defined with AWS CDK in TypeScript, in the `infra/` directory of this repository.

## Reason

- The whole project is TypeScript, so the infrastructure uses the same language, tooling and tests (Jest).
- CDK stacks can be unit tested (`Template.fromStack`) without deploying anything.
- SAM was considered. It is simpler for Lambda-only apps, but the plan also needs Cognito, S3, CloudFront and more, where CDK is more convenient.

## Consequences

- `cdk deploy` creates real resources in the AWS account; it is run by hand until the deploy pipeline exists (see `docs/aws-plan.md`, stage 4).
- Secrets are never in the repository: stacks read them from AWS Secrets Manager by name.
