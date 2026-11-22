#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { CognitoAuthStack } from '../lib/cognito-auth-stack';

const app = new App();

// Values come from CDK context (`cdk deploy -c key=value`) with local defaults.
const context = (key: string, fallback: string): string =>
  app.node.tryGetContext(key) ?? fallback;

new CognitoAuthStack(app, 'CinemateAuth', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'eu-central-1',
  },
  domainPrefix: context('domainPrefix', 'cinemate-auth'),
  callbackUrls: [
    'http://localhost:3000/api/auth/callback',
    ...(app.node.tryGetContext('productionCallbackUrl')
      ? [app.node.tryGetContext('productionCallbackUrl')]
      : []),
  ],
  logoutUrls: [
    'http://localhost:4200',
    ...(app.node.tryGetContext('productionLogoutUrl')
      ? [app.node.tryGetContext('productionLogoutUrl')]
      : []),
  ],
});
