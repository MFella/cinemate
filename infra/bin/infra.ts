#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import * as path from 'path';
import { BackendStack } from '../lib/backend-stack';
import { CognitoAuthStack } from '../lib/cognito-auth-stack';
import { FrontendStack } from '../lib/frontend-stack';
import { GithubDeployStack } from '../lib/github-deploy-stack';
import { MonitoringStack } from '../lib/monitoring-stack';

const app = new App();

// Values come from CDK context (`cdk deploy -c key=value`) with local defaults.
const context = (key: string, fallback: string): string =>
  app.node.tryGetContext(key) ?? fallback;

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'eu-central-1',
};

// Public URL of the site (CloudFront); the backend needs it before the frontend stack
// can point at the API, so it is a plain value instead of a cross-stack reference.
const frontendUrl = context(
  'frontendUrl',
  'https://dp4vq19ji7yw3.cloudfront.net'
);

const backend = new BackendStack(app, 'CinemateBackend', {
  env,
  assetsPath: path.join(__dirname, '../../dist/apps/backend-lambda'),
  frontendUrl,
  secretName: context('backendSecretName', 'cinemate/backend'),
  cognito: {
    region: 'eu-central-1',
    userPoolId: context('userPoolId', 'eu-central-1_sDzY96Ngw'),
    clientId: context('clientId', '7c0e748sheqtilvv01pdo135o9'),
    domain: context(
      'cognitoDomain',
      'cinemate-auth.auth.eu-central-1.amazoncognito.com'
    ),
  },
  demoMode: context('demoMode', 'true') === 'true',
});

new FrontendStack(app, 'CinemateFrontend', {
  env,
  assetsPath: path.join(__dirname, '../../dist/apps/frontend-static/browser'),
  apiDomain: backend.apiDomain,
});

new CognitoAuthStack(app, 'CinemateAuth', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'eu-central-1',
  },
  domainPrefix: context('domainPrefix', 'cinemate-auth'),
  callbackUrls: [
    'http://localhost:3000/api/auth/callback',
    `${frontendUrl}/api/auth/callback`,
  ],
  logoutUrls: ['http://localhost:4200', frontendUrl],
});

new GithubDeployStack(app, 'CinemateGithubDeploy', {
  env,
  repository: context('githubRepository', 'MFella/cinemate'),
  branch: context('deployBranch', 'main'),
});

// Alerts go to a mailbox given at deploy time (`-c alertEmail=...`), never stored in git.
// The stack is always part of the app, so that the exports of the backend stack that it
// reads stay stable when the pipeline deploys only the backend and the frontend.
new MonitoringStack(app, 'CinemateMonitoring', {
  env,
  alertEmail: context('alertEmail', 'alerts@example.invalid'),
  fn: backend.fn,
  api: backend.api,
  monthlyBudgetUsd: Number(context('monthlyBudgetUsd', '5')),
});
