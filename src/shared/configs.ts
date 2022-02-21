import { resolve } from 'path';
import { config } from 'dotenv';
import * as env from 'env-var';

config({ path: resolve(__dirname, '../../.env') });

export const CDK_DEFAULT_ACCOUNT = env.get('CDK_DEFAULT_ACCOUNT').required().asString();
export const CDK_DEFAULT_REGION = env.get('CDK_DEFAULT_REGION').required().asString();
export const USER_POOL_ID = env.get('USER_POOL_ID').required().asString();
export const USER_POOL_APP_CLIENT_ID = env.get('USER_POOL_APP_CLIENT_ID').required().asString();
export const SEARCH_DOMAIN = 'SEARCH_DOMAIN';