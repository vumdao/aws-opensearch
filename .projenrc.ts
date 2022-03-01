import { awscdk } from "projen";
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: "2.15.0",
  defaultReleaseBranch: "master",
  name: "opensearch",
  projenrcTs: true,
  gitignore: ['.idea'],
  deps: [
    'env-var', 'dotenv', 'url',
    '@aws-cdk/aws-apigatewayv2-alpha',
    '@aws-cdk/aws-apigatewayv2-integrations-alpha',
    '@aws-cdk/aws-lambda-python-alpha'
  ]
});

const dotEnvFile = '.env'
project.gitignore.addPatterns(dotEnvFile);

// This is used to deploy manually with specific AWS profile
project.cdkConfig.json.addOverride('profile', 'mfa');

const list = project.addTask("ls");
list.exec("cdk ls");

const deploy = project.addTask("deployall");
deploy.exec("cdk deploy --all");

const destroyall = project.addTask("destroyall");
destroyall.exec("cdk destroy --all");

project.synth();