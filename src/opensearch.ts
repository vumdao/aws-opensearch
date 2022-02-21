import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';
import { PolicyStatement, AnyPrincipal } from 'aws-cdk-lib/aws-iam';
import { Domain, EngineVersion } from 'aws-cdk-lib/aws-opensearchservice';
import { Construct } from 'constructs';
import { LAMBDA_ROLE_NAME, OPENSEARCH_DOMAIN_NAME, OPENSEARCH_DOMAIN_ENDPOINT } from './shared/constants';


export class OpensearchStack extends Stack {

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const osDomain = new Domain(this, 'OpensearchDomain', {
      domainName: OPENSEARCH_DOMAIN_NAME,
      version: EngineVersion.OPENSEARCH_1_1,
      removalPolicy: RemovalPolicy.DESTROY,
      capacity: {
        dataNodes: 2,
        dataNodeInstanceType: 't3.small.search',
      },
      zoneAwareness: {
        enabled: true,
        availabilityZoneCount: 2,
      },
      fineGrainedAccessControl: {
        masterUserArn: `arn:aws:iam::${this.account}:role/${LAMBDA_ROLE_NAME}`,
      },
      accessPolicies: [new PolicyStatement({
        actions: ['es:*'],
        resources: [`arn:aws:es:${this.region}:${this.account}:domain/${OPENSEARCH_DOMAIN_NAME}/*`],
        principals: [new AnyPrincipal()],
      })],
      encryptionAtRest: {
        enabled: true,
      },
      enforceHttps: true,
      nodeToNodeEncryption: true,
      ebs: {
        volumeSize: 10,
        volumeType: EbsDeviceVolumeType.GENERAL_PURPOSE_SSD,
      },
    });

    new CfnOutput(this, 'OSDomainEndpoint', {
      description: 'Opensearch Domain Endpoint',
      value: `https://${osDomain.domainEndpoint}`,
      exportName: OPENSEARCH_DOMAIN_ENDPOINT,
    });
  }
}
