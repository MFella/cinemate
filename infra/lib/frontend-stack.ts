import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  OriginRequestPolicy,
  PriceClass,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin, S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export interface FrontendStackProps extends StackProps {
  /** Folder with the static Angular build (`nx build frontend -c static`) */
  assetsPath: string;
  /** Host of the backend API; `/api/*` is forwarded there when set */
  apiDomain?: string;
}

/**
 * Static frontend: a private S3 bucket behind CloudFront (origin access control).
 * Unknown paths fall back to `index.html` so Angular routes work after a reload.
 */
export class FrontendStack extends Stack {
  readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, 'SiteBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.distribution = new Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      priceClass: PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: props.apiDomain
        ? {
            // one origin for the browser: cookies work without CORS or SameSite tricks
            'api/*': {
              origin: new HttpOrigin(props.apiDomain),
              viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
              allowedMethods: AllowedMethods.ALLOW_ALL,
              cachePolicy: CachePolicy.CACHING_DISABLED,
              // forwards cookies, query strings and headers (not Host) to the API
              originRequestPolicy:
                OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
            },
          }
        : undefined,
      // S3 answers 403 for missing keys when the bucket is private
      errorResponses: [403, 404].map(httpStatus => ({
        httpStatus,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
      })),
    });

    new BucketDeployment(this, 'Deployment', {
      sources: [Source.asset(props.assetsPath)],
      destinationBucket: bucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });

    new CfnOutput(this, 'SiteUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
    });
  }
}
