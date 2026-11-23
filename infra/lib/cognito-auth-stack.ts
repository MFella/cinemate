import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  SecretValue,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import {
  OAuthScope,
  ProviderAttribute,
  UserPool,
  UserPoolClient,
  UserPoolClientIdentityProvider,
  UserPoolIdentityProviderFacebook,
  UserPoolIdentityProviderGoogle,
} from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface CognitoAuthStackProps extends StackProps {
  /** Prefix of the hosted UI domain: `<prefix>.auth.<region>.amazoncognito.com` */
  domainPrefix: string;
  /** Backend callback URLs (`.../api/auth/callback`) */
  callbackUrls: Array<string>;
  /** Frontend URLs users return to after logout */
  logoutUrls: Array<string>;
  /** Secrets Manager secrets holding `{ "clientId": "...", "clientSecret": "..." }` */
  googleSecretName?: string;
  facebookSecretName?: string;
}

/**
 * Sign-in for Cinemate: a federation-only user pool (Google, Facebook), a hosted UI
 * domain and one app client for the backend (authorization code flow).
 * See docs/adr/0002-cognito-for-authentication.md
 */
export class CognitoAuthStack extends Stack {
  constructor(scope: Construct, id: string, props: CognitoAuthStackProps) {
    super(scope, id, props);

    const {
      googleSecretName = 'cinemate/google-oauth',
      facebookSecretName = 'cinemate/facebook-oauth',
    } = props;

    const userPool = new UserPool(this, 'UserPool', {
      userPoolName: 'cinemate',
      // users come only from Google/Facebook; nobody registers with a password
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      // it holds the users: never delete it together with the stack
      removalPolicy: RemovalPolicy.RETAIN,
      deletionProtection: true,
    });

    const secretField = (secretName: string, field: string) =>
      SecretValue.secretsManager(secretName, { jsonField: field });

    const google = new UserPoolIdentityProviderGoogle(this, 'Google', {
      userPool,
      // the OAuth client id is not secret, but keeping both in one secret is simpler;
      // CloudFormation resolves {{resolve:secretsmanager:...}} when it deploys
      clientId: secretField(googleSecretName, 'clientId').unsafeUnwrap(),
      clientSecretValue: secretField(googleSecretName, 'clientSecret'),
      scopes: ['profile', 'email', 'openid'],
      attributeMapping: {
        email: ProviderAttribute.GOOGLE_EMAIL,
        profilePicture: ProviderAttribute.GOOGLE_PICTURE,
      },
    });

    const facebook = new UserPoolIdentityProviderFacebook(this, 'Facebook', {
      userPool,
      clientId: secretField(facebookSecretName, 'clientId').unsafeUnwrap(),
      // a dynamic reference to the secret, not its value
      clientSecret: secretField(
        facebookSecretName,
        'clientSecret'
      ).unsafeUnwrap(),
      scopes: ['public_profile', 'email'],
      attributeMapping: {
        email: ProviderAttribute.FACEBOOK_EMAIL,
        profilePicture: ProviderAttribute.other('picture'),
      },
    });

    const domain = userPool.addDomain('HostedUiDomain', {
      cognitoDomain: { domainPrefix: props.domainPrefix },
    });

    const client = new UserPoolClient(this, 'BackendClient', {
      userPool,
      userPoolClientName: 'cinemate-backend',
      // the backend exchanges the code, so it can keep a client secret
      generateSecret: true,
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [OAuthScope.OPENID, OAuthScope.EMAIL, OAuthScope.PROFILE],
        callbackUrls: props.callbackUrls,
        logoutUrls: props.logoutUrls,
      },
      supportedIdentityProviders: [
        UserPoolClientIdentityProvider.GOOGLE,
        UserPoolClientIdentityProvider.FACEBOOK,
      ],
      // same length as the session cookie of the app, so no token refresh is needed
      idTokenValidity: Duration.hours(24),
      accessTokenValidity: Duration.hours(1),
      preventUserExistenceErrors: true,
    });
    client.node.addDependency(google, facebook);

    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new CfnOutput(this, 'ClientId', { value: client.userPoolClientId });
    new CfnOutput(this, 'Domain', {
      value: `${domain.domainName}.auth.${this.region}.amazoncognito.com`,
    });
    new CfnOutput(this, 'Region', { value: this.region });
  }
}
