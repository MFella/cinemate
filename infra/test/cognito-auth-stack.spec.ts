import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { CognitoAuthStack } from '../lib/cognito-auth-stack';

const build = (
  props: Partial<ConstructorParameters<typeof CognitoAuthStack>[2]> = {}
) => {
  const app = new App();
  const stack = new CognitoAuthStack(app, 'TestStack', {
    env: { account: '123456789012', region: 'eu-central-1' },
    domainPrefix: 'cinemate-test',
    callbackUrls: ['http://localhost:3000/api/auth/callback'],
    logoutUrls: ['http://localhost:4200'],
    ...props,
  });
  return Template.fromStack(stack);
};

describe('CognitoAuthStack', () => {
  describe('user pool', () => {
    it('is federation-only: nobody can register with a password', () => {
      build().hasResourceProperties('AWS::Cognito::UserPool', {
        AdminCreateUserConfig: { AllowAdminCreateUserOnly: true },
      });
    });

    it('is kept (not deleted) with the stack, because it holds the users', () => {
      const template = build();

      template.hasResource('AWS::Cognito::UserPool', {
        DeletionPolicy: 'Retain',
        UpdateReplacePolicy: 'Retain',
        Properties: { DeletionProtection: 'ACTIVE' },
      });
    });

    it('has exactly one pool', () => {
      build().resourceCountIs('AWS::Cognito::UserPool', 1);
    });
  });

  describe('hosted UI domain', () => {
    it('uses the given Cognito domain prefix', () => {
      build().hasResourceProperties('AWS::Cognito::UserPoolDomain', {
        Domain: 'cinemate-test',
      });
    });
  });

  describe('identity providers', () => {
    it('federates Google with the secret read from Secrets Manager', () => {
      build().hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ProviderName: 'Google',
        ProviderType: 'Google',
        ProviderDetails: Match.objectLike({
          client_id: Match.stringLikeRegexp(
            'resolve:secretsmanager:cinemate/google-oauth'
          ),
          client_secret: Match.stringLikeRegexp(
            'resolve:secretsmanager:cinemate/google-oauth'
          ),
          authorize_scopes: 'profile email openid',
        }),
      });
    });

    it('federates Facebook with the secret read from Secrets Manager', () => {
      build().hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ProviderName: 'Facebook',
        ProviderType: 'Facebook',
        ProviderDetails: Match.objectLike({
          client_id: Match.stringLikeRegexp(
            'resolve:secretsmanager:cinemate/facebook-oauth'
          ),
          client_secret: Match.stringLikeRegexp(
            'resolve:secretsmanager:cinemate/facebook-oauth'
          ),
        }),
      });
    });

    it('maps the e-mail and the picture to user attributes', () => {
      build().hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ProviderName: 'Google',
        AttributeMapping: { email: 'email', picture: 'picture' },
      });
    });

    it('allows no other providers (just Google and Facebook)', () => {
      build().resourceCountIs('AWS::Cognito::UserPoolIdentityProvider', 2);
    });

    it('does not put any secret value in the template', () => {
      const json = JSON.stringify(build().toJSON());

      // only references like {{resolve:secretsmanager:...}}, never a literal secret
      expect(json).not.toMatch(/client_secret":"(?!\{\{resolve)/);
    });
  });

  describe('app client', () => {
    it('uses the authorization code flow only, with a client secret', () => {
      build().hasResourceProperties('AWS::Cognito::UserPoolClient', {
        GenerateSecret: true,
        AllowedOAuthFlows: ['code'],
        AllowedOAuthFlowsUserPoolClient: true,
      });
    });

    it('asks for the openid, email and profile scopes only', () => {
      const client = Object.values(
        build().findResources('AWS::Cognito::UserPoolClient')
      )[0] as { Properties: { AllowedOAuthScopes: Array<string> } };

      expect([...client.Properties.AllowedOAuthScopes].sort()).toEqual([
        'email',
        'openid',
        'profile',
      ]);
    });

    it('offers only the Google and Facebook providers', () => {
      build().hasResourceProperties('AWS::Cognito::UserPoolClient', {
        SupportedIdentityProviders: ['Google', 'Facebook'],
      });
    });

    it('registers the callback and sign-out URLs it was given', () => {
      build({
        callbackUrls: [
          'http://localhost:3000/api/auth/callback',
          'https://api.example.com/api/auth/callback',
        ],
        logoutUrls: ['http://localhost:4200', 'https://app.example.com'],
      }).hasResourceProperties('AWS::Cognito::UserPoolClient', {
        CallbackURLs: [
          'http://localhost:3000/api/auth/callback',
          'https://api.example.com/api/auth/callback',
        ],
        LogoutURLs: ['http://localhost:4200', 'https://app.example.com'],
      });
    });

    it('keeps the ID token valid for 24 hours (the session length of the app)', () => {
      build().hasResourceProperties('AWS::Cognito::UserPoolClient', {
        // CDK writes 24 hours as 1440 minutes
        IdTokenValidity: 1440,
        TokenValidityUnits: Match.objectLike({ IdToken: 'minutes' }),
      });
    });

    it('hides whether a user exists', () => {
      build().hasResourceProperties('AWS::Cognito::UserPoolClient', {
        PreventUserExistenceErrors: 'ENABLED',
      });
    });

    it('is created only after the identity providers it lists', () => {
      const client = Object.values(
        build().findResources('AWS::Cognito::UserPoolClient')
      )[0] as { DependsOn?: Array<string> };

      expect(client.DependsOn?.length).toBe(2);
    });
  });

  describe('outputs', () => {
    it('prints what the backend needs (but not the client secret)', () => {
      const outputs = build().toJSON().Outputs as Record<string, unknown>;

      expect(Object.keys(outputs).sort()).toEqual([
        'ClientId',
        'Domain',
        'Region',
        'UserPoolId',
      ]);
    });

    it('prints the full hosted UI domain', () => {
      const value = JSON.stringify(
        (build().toJSON().Outputs as Record<string, unknown>)['Domain']
      );

      // the domain prefix and region are joined with the Cognito host name
      expect(value).toContain('.auth.');
      expect(value).toContain('.amazoncognito.com');
    });
  });
});
