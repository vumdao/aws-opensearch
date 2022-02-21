import { BlockPublicAccess, Bucket, BucketEncryption, EventType } from 'aws-cdk-lib/aws-s3';
import { Fn, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LAMBDA_FUNCTION_NAME } from './shared/constants';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { Function } from 'aws-cdk-lib/aws-lambda';


export class S3ToLambdaQuery extends Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        const lambdaOsArn = Fn.importValue(LAMBDA_FUNCTION_NAME)

        const s3DataIndex = new Bucket(this, 'DataIndex', {
            bucketName: 'opensearch-data-index',
            encryption: BucketEncryption.S3_MANAGED,
            removalPolicy: RemovalPolicy.DESTROY,
            blockPublicAccess: BlockPublicAccess.BLOCK_ACLS
        });
        s3DataIndex.addEventNotification(EventType.OBJECT_CREATED_PUT, new LambdaDestination(Function.fromFunctionArn(this, 'lambdaOsArn', lambdaOsArn)))
    }
}