import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import {
  Effect,
  OpenIdConnectProvider,
  PolicyStatement,
  Role,
  WebIdentityPrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface GithubDeployStackProps extends StackProps {
  /** `owner/name` of the repository allowed to deploy */
  repository: string;
  /** Only workflows running on this branch can assume the role */
  branch: string;
}

/**
 * Lets GitHub Actions deploy without any stored AWS keys: the workflow presents a
 * short-lived OIDC token and trades it for this role. The role itself can only assume
 * the CDK bootstrap roles, which hold the actual deployment permissions.
 */
export class GithubDeployStack extends Stack {
  constructor(scope: Construct, id: string, props: GithubDeployStackProps) {
    super(scope, id, props);

    const provider = new OpenIdConnectProvider(this, 'GithubProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    const role = new Role(this, 'DeployRole', {
      // a fixed name: the workflow refers to the role by its ARN
      roleName: 'cinemate-github-deploy',
      description: `GitHub Actions deploys of ${props.repository} (${props.branch})`,
      maxSessionDuration: Duration.hours(1),
      assumedBy: new WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          // one repository and one branch: pull requests and forks cannot deploy
          'token.actions.githubusercontent.com:sub': `repo:${props.repository}:ref:refs/heads/${props.branch}`,
        },
      }),
    });

    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [
          `arn:${this.partition}:iam::${this.account}:role/cdk-hnb659fds-*-role-${this.account}-${this.region}`,
        ],
      })
    );

    new CfnOutput(this, 'DeployRoleArn', { value: role.roleArn });
  }
}
