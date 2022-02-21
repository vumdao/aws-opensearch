import { App } from 'aws-cdk-lib';
import { ApiToLambda } from './apigw-rest';
import { OpensearchStack } from './opensearch';
import { CDK_DEFAULT_ACCOUNT, CDK_DEFAULT_REGION } from './shared/configs';

const app = new App();

const envSet = {
  region: CDK_DEFAULT_REGION,
  account: CDK_DEFAULT_ACCOUNT,
};

const opensearchStack = new OpensearchStack(app, 'OpensearchStack', {
  description: 'Opensearch Demo',
  env: envSet,
  tags: {
    service: 'opensearch',
    stage: 'demo',
  },
});

const apigwStack = new ApiToLambda(app, 'APIGWLambda', {
  description: 'API GW to lambda',
  env: envSet,
  tags: {
    service: 'opensearch',
    stage: 'demo',
  },
});
apigwStack.addDependency(opensearchStack);

app.synth();