import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { CfnStage, HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface BackendStackProps extends StackProps {
  /** Folder with the Lambda bundle (`nx run backend:build-lambda`) */
  assetsPath: string;
  /** Public URL of the frontend (CloudFront), used for CORS and the sign-out redirect */
  frontendUrl: string;
  /** Existing secret (JSON) with DATABASE_URL, TMDB_API_TOKEN, COGNITO_CLIENT_SECRET, ... */
  secretName: string;
  cognito: {
    region: string;
    userPoolId: string;
    clientId: string;
    domain: string;
  };
  demoMode: boolean;
}

/**
 * The Nest backend as one Lambda behind an HTTP API (`ANY /{proxy+}`).
 * Secrets stay in Secrets Manager; the function reads them on a cold start.
 */
export class BackendStack extends Stack {
  /** Host name of the API (without scheme), the origin of CloudFront's `/api/*` */
  readonly apiDomain: string;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    const secret = Secret.fromSecretNameV2(this, 'Secret', props.secretName);

    const fn = new Function(this, 'Function', {
      runtime: Runtime.NODEJS_22_X,
      // the Prisma query engine in the bundle is built for x86_64
      architecture: Architecture.X86_64,
      handler: 'main.handler',
      code: Code.fromAsset(props.assetsPath),
      memorySize: 1024,
      timeout: Duration.seconds(29),
      logRetention: RetentionDays.ONE_MONTH,
      environment: {
        NODE_ENV: 'production',
        BACKEND_SECRET_ID: secret.secretName,
        FRONTEND_URL: props.frontendUrl,
        TMDB_API_URL: 'https://api.themoviedb.org/3/',
        COGNITO_REGION: props.cognito.region,
        COGNITO_USER_POOL_ID: props.cognito.userPoolId,
        COGNITO_CLIENT_ID: props.cognito.clientId,
        COGNITO_DOMAIN: props.cognito.domain,
        COGNITO_REDIRECT_URI: `${props.frontendUrl}/api/auth/callback`,
        DEMO_MODE: String(props.demoMode),
      },
    });
    secret.grantRead(fn);

    const api = new HttpApi(this, 'Api', {
      // the browser only talks to CloudFront, which forwards `/api/*` here
      createDefaultStage: true,
    });
    const integration = new HttpLambdaIntegration('Nest', fn);
    api.addRoutes({
      path: '/{proxy+}',
      methods: [HttpMethod.ANY],
      integration,
    });
    // its own route so that it can be throttled: every call may rebuild the demo data
    const [demoRoute] = api.addRoutes({
      path: '/api/auth/demo',
      methods: [HttpMethod.POST],
      integration,
    });
    const stage = api.defaultStage?.node.defaultChild as CfnStage;
    // the route settings refer to the route, so it has to exist first
    stage.node.addDependency(demoRoute);
    stage.routeSettings = {
      'POST /api/auth/demo': {
        ThrottlingRateLimit: 2,
        ThrottlingBurstLimit: 5,
      },
    };

    this.apiDomain = `${api.apiId}.execute-api.${this.region}.amazonaws.com`;

    new CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });
  }
}
