export const resources = {
  Resources: {
    UsersTable: {
      Type: 'AWS::DynamoDB::Table',
      Properties: {
        TableName: '${self:service}-users-${self:provider.stage}',
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [
          {
            AttributeName: 'userId',
            AttributeType: 'S',
          },
        ],
        KeySchema: [
          {
            AttributeName: 'userId',
            KeyType: 'HASH',
          },
        ],
        StreamSpecification: {
          StreamViewType: 'NEW_AND_OLD_IMAGES',
        },
      },
    },
    UserUpdateQueue: {
      Type: 'AWS::SQS::Queue',
      Properties: {
        QueueName: '${self:service}-user-update-queue-${self:provider.stage}',
        VisibilityTimeoutSeconds: 30,
        MessageRetentionPeriod: 1209600,
        ReceiveMessageWaitTimeSeconds: 20,
        RedrivePolicy: {
          deadLetterTargetArn: {
            'Fn::GetAtt': ['UserUpdateDLQ', 'Arn'],
          },
          maxReceiveCount: 3,
        },
      },
    },
    UserUpdateDLQ: {
      Type: 'AWS::SQS::Queue',
      Properties: {
        QueueName: '${self:service}-user-update-dlq-${self:provider.stage}',
        MessageRetentionPeriod: 1209600,
      },
    },
    UserUpdateToBusPipe: {
      Type: 'AWS::Pipes::Pipe',
      Properties: {
        Name: '${self:service}-user-update-to-bus-pipe-${self:provider.stage}',
        Source: {
          'Fn::GetAtt': ['UsersTable', 'Arn'],
        },
        Target: {
          'Fn::GetAtt': ['UserUpdateQueue', 'Arn'],
        },
        TargetParameters: {
          SqsQueueParameters: {
            MessageBody: '{"newUserData": <$.dynamodb.NewImage>, "oldUserData": <$.dynamodb.OldImage>}',
          },
        },
        RoleArn: {
          'Fn::GetAtt': ['EventBridgePipeRole', 'Arn'],
        },
      },
    },
    SchedulerExecutionRole: {
      Type: 'AWS::IAM::Role',
      Properties: {
        RoleName: '${self:service}-scheduler-execution-role-${self:provider.stage}',
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'scheduler.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            },
          ],
        },
        Policies: [
          {
            PolicyName: '${self:service}-scheduler-lambda-policy-${self:provider.stage}',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: [
                    'lambda:InvokeFunction',
                  ],
                  Resource: [
                    {
                      'Fn::GetAtt': ['sendGreeting', 'Arn'],
                    }
                  ],
                },
              ],
            },
          },
          {
            PolicyName: '${self:service}-scheduler-management-policy-${self:provider.stage}',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: [
                    'scheduler:CreateSchedule',
                    'scheduler:DeleteSchedule',
                    'scheduler:GetSchedule',
                    'scheduler:UpdateSchedule',
                  ],
                  Resource: [
                    'arn:aws:scheduler:${self:provider.region}:${self:custom.AWS_ACCOUNT_ID}:schedule/${self:service}-*',
                  ],
                },
              ],
            },
          },
        ],
      },
    },
    LambdaExecutionRole: {
      Type: 'AWS::IAM::Role',
      Properties: {
        RoleName: '${self:service}-lambda-execution-role-${self:provider.stage}',
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            },
          ],
        },
        ManagedPolicyArns: [
          'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        ],
        Policies: [
          {
            PolicyName: '${self:service}-dynamodb-policy-${self:provider.stage}',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: [
                    'dynamodb:GetItem',
                    'dynamodb:PutItem',
                    'dynamodb:UpdateItem',
                    'dynamodb:DeleteItem',
                    'dynamodb:Query',
                    'dynamodb:Scan',
                  ],
                  Resource: [
                    {
                      'Fn::GetAtt': ['UsersTable', 'Arn'],
                    },
                  ],
                },
              ],
            },
          },
          {
            PolicyName: '${self:service}-eventbridge-policy-${self:provider.stage}',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: [
                    'events:PutEvents',
                  ],
                  Resource: '*',
                },
              ],
            },
          },
          {
            PolicyName: '${self:service}-scheduler-policy-${self:provider.stage}',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: [
                    'scheduler:CreateSchedule',
                    'scheduler:DeleteSchedule',
                    'scheduler:GetSchedule',
                    'scheduler:UpdateSchedule',
                  ],
                  Resource: [
                    'arn:aws:scheduler:${self:provider.region}:${self:custom.AWS_ACCOUNT_ID}:schedule/${self:service}-*',
                  ],
                },
              ],
            },
          }
        ],
      },
    },
    SendGreetingLambdaPermission: {
      Type: 'AWS::Lambda::Permission',
      Properties: {
        FunctionName: {
          'Fn::GetAtt': ['sendGreeting', 'Arn'],
        },
        StatementId: 'EventBridgeSchedulerInvokePermission',
        Action: 'lambda:InvokeFunction',
        Principal: 'scheduler.amazonaws.com',
        SourceArn: 'arn:aws:scheduler:${self:provider.region}:${self:custom.AWS_ACCOUNT_ID}:schedule/${self:service}-*',
      },
    },
    EventBridgePipeRole: {
      Type: 'AWS::IAM::Role',
      Properties: {
        RoleName: '${self:service}-eventbridge-pipe-role-${self:provider.stage}',
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'pipes.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            },
          ],
        },
        Policies: [
          {
            PolicyName: '${self:service}-pipe-sqs-policy-${self:provider.stage}',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: [
                    'sqs:SendMessage',
                  ],
                  Resource: [
                    {
                      'Fn::GetAtt': ['UserUpdateQueue', 'Arn'],
                    },
                  ],
                },
              ],
            },
          },
          {
            PolicyName: '${self:service}-source-policy-${self:provider.stage}',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: [
                    'dynamodb:DescribeStream',
                    'dynamodb:GetRecords',
                    'dynamodb:GetShardIterator',
                    'dynamodb:ListStreams',
                  ],
                  Resource: [
                    {
                      'Fn::GetAtt': ['UsersTable', 'StreamArn'],
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
    EventBridgeRuleRole: {
      Type: 'AWS::IAM::Role',
      Properties: {
        RoleName: '${self:service}-eventbridge-rule-role-${self:provider.stage}',
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'events.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            },
          ],
        },
        Policies: [
          {
            PolicyName: '${self:service}-rule-lambda-policy-${self:provider.stage}',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: [
                    'lambda:InvokeFunction',
                  ],
                  Resource: [
                    'arn:aws:lambda:${self:provider.region}:*:function:${self:service}-*',
                  ],
                },
              ],
            },
          },
        ],
      },
    },
    DynamoDBStreamRole: {
      Type: 'AWS::IAM::Role',
      Properties: {
        RoleName: '${self:service}-dynamodb-stream-role-${self:provider.stage}',
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            },
          ],
        },
        ManagedPolicyArns: [
          'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        ],
        Policies: [
          {
            PolicyName: '${self:service}-dynamodb-stream-policy-${self:provider.stage}',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: [
                    'dynamodb:DescribeStream',
                    'dynamodb:GetRecords',
                    'dynamodb:GetShardIterator',
                    'dynamodb:ListStreams',
                  ],
                  Resource: [
                    'arn:aws:dynamodb:${self:provider.region}:*:table/${self:service}-users-${self:provider.stage}/stream/*',
                  ],
                },
              ],
            },
          },
        ],
      },
    },
  },
  Outputs: {
    UserUpdateQueueUrl: {
      Description: 'URL of the User Update Queue',
      Value: {
        Ref: 'UserUpdateQueue',
      },
      Export: {
        Name: '${self:service}-user-update-queue-url-${self:provider.stage}',
      },
    },
    UserUpdateQueueArn: {
      Description: 'ARN of the User Update Queue',
      Value: {
        'Fn::GetAtt': ['UserUpdateQueue', 'Arn'],
      },
      Export: {
        Name: '${self:service}-user-update-queue-arn-${self:provider.stage}',
      },
    },
    UserUpdateDLQUrl: {
      Description: 'URL of the User Update Dead Letter Queue',
      Value: {
        Ref: 'UserUpdateDLQ',
      },
      Export: {
        Name: '${self:service}-user-update-dlq-url-${self:provider.stage}',
      },
    },
    UserUpdateToBusPipeName: {
      Description: 'Name of the User Update to Bus Pipe',
      Value: {
        Ref: 'UserUpdateToBusPipe',
      },
      Export: {
        Name: '${self:service}-user-update-to-bus-pipe-name-${self:provider.stage}',
      },
    }
  },
}; 