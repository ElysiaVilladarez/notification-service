import type { AWS } from '@serverless/typescript';
import { functions } from './functions';
import { resources } from './resources';

const serverlessConfiguration: AWS = {
  service: 'notification-service',
  frameworkVersion: '3',
  provider: {
    name: 'aws',
    runtime: "nodejs20.x",
    region: 'us-east-1',
    stage: '${opt:stage, "dev"}',
    environment: {
      SERVICE_NAME: '${self:service}',
      STAGE: '${self:provider.stage}',
      ENVIRONMENT: '${self:provider.stage}',
      USERS_TABLE_NAME: '${self:service}-users-${self:provider.stage}',
      USER_BIRTHDAY_TABLE_NAME: '${self:service}-user-birthday-${self:provider.stage}',
      AWS_ACCOUNT_ID: '${self:custom.AWS_ACCOUNT_ID}',
      AWS_REGION: '${self:custom.AWS_REGION}',
      USER_UPDATE_QUEUE_URL: '${self:service}-user-update-queue-${self:provider.stage}',
      BIRTHDAY_NOTIFICATION_HOUR: '${self:custom.BIRTHDAY_NOTIFICATION_HOUR}',
      BIRTHDAY_NOTIFICATION_MINUTE: '${self:custom.BIRTHDAY_NOTIFICATION_MINUTE}',
      PIPEDREAM_BASE_URL: '${self:custom.PIPEDREAM_BASE_URL}'
    }
  },
  useDotenv: true,
  plugins: [
    'serverless-dotenv-plugin',
    'serverless-esbuild', 
    // 'serverless-lift',
    // 'serverless-offline-sqs',
    // 'sls-offline-aws-sqs',
    'serverless-offline-lambda',
    'serverless-offline-aws-eventbridge',
    'serverless-plugin-offline-dynamodb-stream',
    'serverless-offline', 
    'serverless-dynamodb'
  ],
  custom: {
    AWS_ACCOUNT_ID: '${env:AWS_ACCOUNT_ID}',
    AWS_REGION: '${env:AWS_REGION}',
    BIRTHDAY_NOTIFICATION_HOUR: '${env:BIRTHDAY_NOTIFICATION_HOUR}',
    BIRTHDAY_NOTIFICATION_MINUTE: '${env:BIRTHDAY_NOTIFICATION_MINUTE}',
    PIPEDREAM_BASE_URL: '${env:PIPEDREAM_BASE_URL}',
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node20',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
      external: ['aws-sdk']
    },
    'serverless-offline': {
      accountId: '${env:AWS_ACCOUNT_ID}',
      httpPort: 3000,
      lambdaPort: 3002,
      noPrependStageInUrl: true,
      useChildProcesses: true,
      allowCache: true,
    },
    'serverless-dynamodb': {
      stages: ['dev'],
      start: {
        port: 8000,
        inMemory: true,
        heapInitial: '200m',
        heapMax: '1g',
        migrate: true,
        seed: true,
      convertEmptyValues: true
      }
    },
    dynamodbStream: {
      host: 'localhost',
      port: 8000,
      pollForever: true,
      region: 'us-east-1',
      streams: [
        { 
          table: '${self:service}-users-${self:provider.stage}',
          functions: ['processUserUpdates']
        }
      ]
    },
    // 'serverless-offline-sqs': {
    //   autoStartAllQueues: true,
    //   queueName: 'notification-service-user-update-queue-dev',
    //   autoCreate: true,
    //   apiVersion: '2012-11-05',
    //   endpoint: 'http://0.0.0.0:9324',
    //   region: 'us-east-1',
    //   skipCacheInvalidation: false
    // }
  },
  functions,
  resources
};

module.exports = serverlessConfiguration; 