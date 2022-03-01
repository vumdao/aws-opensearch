import { join } from 'path';
import { HttpApi, HttpMethod, HttpAuthorizer, HttpAuthorizerType, CorsHttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { Fn, Stack, StackProps, CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { BlockPublicAccess, Bucket, BucketEncryption, EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';
import { USER_POOL_APP_CLIENT_ID, USER_POOL_ID } from './shared/configs';
import { APIGW_ROUTE_PATH, LAMBDA_FUNCTION_NAME, LAMBDA_ROLE_NAME, OPENSEARCH_DOMAIN_ENDPOINT } from './shared/constants';


export class ApiGwToLambda extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const opensearchDomain = Fn.importValue(OPENSEARCH_DOMAIN_ENDPOINT);

    const lambdaRole = new Role(this, 'LambdaOsRole', {
      roleName: LAMBDA_ROLE_NAME,
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    const lambdaOs = new PythonFunction(this, 'IndexLambda', {
      functionName: LAMBDA_FUNCTION_NAME,
      entry: join(__dirname, 'lambda-handler'),
      runtime: Runtime.PYTHON_3_9,
      role: lambdaRole,
      timeout: Duration.minutes(3),
      environment: {
        SEARCH_DOMAIN: opensearchDomain,
      },
      index: 'app.py',
    });

    const logGroup = new LogGroup(this, 'LambdaLogGroup', {
      logGroupName: `/aws/lambda/${LAMBDA_FUNCTION_NAME}`,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_WEEK,
    });
    logGroup.grantWrite(lambdaOs);

    new CfnOutput(this, 'LambdaOsFuncOutput', {
      value: lambdaOs.functionArn,
      exportName: LAMBDA_FUNCTION_NAME,
    });

    const apigwv2ToLambda = new HttpApi(this, 'ApiGwToLambda', {
      description: 'Public API for searching an Amazon OpenSearch Service domain',
      corsPreflight: {
        allowOrigins: ['*'],
        allowHeaders: ['*'],
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST],
      },
    });

    const apigwv2Auth = new HttpAuthorizer(this, 'Auth', {
      httpApi: apigwv2ToLambda,
      authorizerName: 'apigw-auth-opensearch',
      type: HttpAuthorizerType.JWT,
      identitySource: ['$request.header.Authorization'],
      jwtAudience: [USER_POOL_APP_CLIENT_ID],
      jwtIssuer: `https://cognito-idp.${this.region}.amazonaws.com/${USER_POOL_ID}`,
    });

    apigwv2ToLambda.addRoutes({
      path: APIGW_ROUTE_PATH,
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration('HttpApiLambdaIg', lambdaOs),
      authorizer: HttpAuthorizer.fromHttpAuthorizerAttributes(this, 'addAuth', {
        authorizerId: apigwv2Auth.authorizerId,
        authorizerType: HttpAuthorizerType.JWT,
      }),
    });

    new CfnOutput(this, 'API stage URL', { value: apigwv2ToLambda.apiEndpoint });

    const s3DataIndex = new Bucket(this, 'DataIndex', {
      bucketName: 'opensearch-data-index',
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
    });
    s3DataIndex.addEventNotification(EventType.OBJECT_CREATED_PUT, new LambdaDestination(lambdaOs), { prefix: 'data/', suffix: '.bulk' });
    s3DataIndex.grantRead(lambdaOs);
  }
}