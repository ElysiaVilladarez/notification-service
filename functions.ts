export const functions = {
  createUser: {
    handler: 'src/functions/user/create-user.handler',
    events: [
      {
        http: {
          method: 'post',
          path: 'user',
          cors: true,
        },
      },
    ],
  },
  getUser: {
    handler: 'src/functions/user/get-user.handler',
    events: [
      {
        http: {
          method: 'get',
          path: 'user/{userId}',
          cors: true,
        },
      },
    ],
  },
  deleteUser: {
    handler: 'src/functions/user/delete-user.handler',
    events: [
      {
        http: {
          method: 'delete',
          path: 'user/{userId}',
          cors: true,
        },
      },
    ],
  },
  processUserUpdates: {
    handler: 'src/functions/process-user-updates.handler',
    events: [
      {
        sqs: {
          arn: {
            'Fn::GetAtt': ['UserUpdateQueue', 'Arn'],
          },
          batchSize: 20
        },
      },
    ]
  },
  sendGreeting: {
    handler: 'src/functions/notification/send-greeting.handler'
  },
}; 