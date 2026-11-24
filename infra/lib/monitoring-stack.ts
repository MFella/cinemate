import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { CfnBudget } from 'aws-cdk-lib/aws-budgets';
import {
  Alarm,
  Dashboard,
  GraphWidget,
  Metric,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

export interface MonitoringStackProps extends StackProps {
  alertEmail: string;
  fn: Function;
  api: HttpApi;
  monthlyBudgetUsd: number;
}

/**
 * Alarms -> SNS topic -> e-mail, a dashboard, and a monthly cost budget.
 * The e-mail subscription has to be confirmed once through the link AWS sends.
 */
export class MonitoringStack extends Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const topic = new Topic(this, 'Alerts', { topicName: 'cinemate-alerts' });
    topic.addSubscription(new EmailSubscription(props.alertEmail));
    const action = new SnsAction(topic);

    const period = Duration.minutes(5);
    const apiMetric = (metricName: string, statistic = 'Sum') =>
      new Metric({
        namespace: 'AWS/ApiGateway',
        metricName,
        dimensionsMap: { ApiId: props.api.apiId },
        statistic,
        period,
      });

    const errors = props.fn.metricErrors({ period });
    const duration = props.fn.metricDuration({ period, statistic: 'p95' });
    const api5xx = apiMetric('5xx');
    const api4xx = apiMetric('4xx');

    const alarms = [
      new Alarm(this, 'LambdaErrors', {
        alarmName: 'cinemate-lambda-errors',
        alarmDescription: 'The backend Lambda threw an error',
        metric: errors,
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      }),
      new Alarm(this, 'LambdaSlow', {
        alarmName: 'cinemate-lambda-slow',
        alarmDescription: 'p95 duration over 10 s (the timeout is 29 s)',
        metric: duration,
        threshold: 10_000,
        evaluationPeriods: 2,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      }),
      new Alarm(this, 'Api5xx', {
        alarmName: 'cinemate-api-5xx',
        alarmDescription: 'The API returned a 5xx response',
        metric: api5xx,
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      }),
      new Alarm(this, 'Api4xxBurst', {
        alarmName: 'cinemate-api-4xx-burst',
        alarmDescription:
          'Many 4xx in 5 min: abuse of the demo route or a broken client',
        metric: api4xx,
        threshold: 50,
        evaluationPeriods: 1,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      }),
    ];
    for (const alarm of alarms) {
      alarm.addAlarmAction(action);
      alarm.addOkAction(action);
    }

    new Dashboard(this, 'Dashboard', {
      dashboardName: 'cinemate',
      widgets: [
        [
          new GraphWidget({
            title: 'Lambda invocations and errors',
            left: [props.fn.metricInvocations({ period }), errors],
            width: 12,
          }),
          new GraphWidget({
            title: 'Lambda duration (p50 / p95)',
            left: [
              props.fn.metricDuration({ period, statistic: 'p50' }),
              duration,
            ],
            width: 12,
          }),
        ],
        [
          new GraphWidget({
            title: 'API requests',
            left: [apiMetric('Count')],
            width: 12,
          }),
          new GraphWidget({
            title: 'API 4xx / 5xx',
            left: [api4xx, api5xx],
            width: 12,
          }),
        ],
      ],
    });

    new CfnBudget(this, 'MonthlyBudget', {
      budget: {
        budgetName: 'cinemate-monthly',
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: { amount: props.monthlyBudgetUsd, unit: 'USD' },
      },
      notificationsWithSubscribers: [
        { threshold: 80, type: 'ACTUAL' },
        { threshold: 100, type: 'FORECASTED' },
      ].map(({ threshold, type }) => ({
        notification: {
          notificationType: type,
          comparisonOperator: 'GREATER_THAN',
          threshold,
          thresholdType: 'PERCENTAGE',
        },
        subscribers: [{ subscriptionType: 'EMAIL', address: props.alertEmail }],
      })),
    });
  }
}
