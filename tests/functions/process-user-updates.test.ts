import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { handler } from '../../src/functions/process-user-updates';
import { SchedulerClient, CreateScheduleCommand, DeleteScheduleCommand } from '@aws-sdk/client-scheduler';
import { SQSClient } from '@aws-sdk/client-sqs';
import { mockUserDataFromDB } from '../setup';

jest.mock('@aws-sdk/client-scheduler');
jest.mock('@aws-sdk/client-sqs');

const MockedSchedulerClient = SchedulerClient as jest.MockedClass<typeof SchedulerClient>;
const MockedSQSClient = SQSClient as jest.MockedClass<typeof SQSClient>;

describe('processUserUpdates Lambda Function', () => {
  let mockSchedulerClient: jest.Mocked<SchedulerClient>;
  let mockSQSClient: jest.Mocked<SQSClient>;
  let mockContext: Context;

  beforeEach(() => {
    mockSchedulerClient = {
      send: jest.fn(),
    } as any;

    mockSQSClient = {
      send: jest.fn(),
    } as any;

    MockedSchedulerClient.mockImplementation(() => mockSchedulerClient);
    MockedSQSClient.mockImplementation(() => mockSQSClient);

    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'processUserUpdates',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:processUserUpdates',
      memoryLimitInMB: '128',
      awsRequestId: 'test-request-id',
      logGroupName: '/aws/lambda/processUserUpdates',
      logStreamName: '2024/01/01/[$LATEST]test-stream',
      getRemainingTimeInMillis: jest.fn().mockReturnValue(30000),
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };

    process.env.STAGE = 'test';
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_ACCOUNT_ID = '123456789012';
    process.env.SERVICE_NAME = 'notification-service';
    process.env.BIRTHDAY_NOTIFICATION_HOUR = '9';
    process.env.BIRTHDAY_NOTIFICATION_MINUTE = '0';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('user creation (INSERT event)', () => {
    it('should create birthday schedule for new user', async () => {
      const sqsEvent: SQSEvent = {
        Records: [
          {
            body: JSON.stringify({
              newUserData: mockUserDataFromDB,
              oldUserData: null,
            }),
            receiptHandle: 'receipt-handle-1',
            messageId: 'message-id-1',
            attributes: {},
            messageAttributes: {},
            md5OfBody: 'md5-hash',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:queue-name',
            awsRegion: 'us-east-1',
          } as SQSRecord,
        ],
      };

      mockSchedulerClient.send.mockResolvedValue({} as never);

      await handler(sqsEvent, mockContext);

      expect(mockSchedulerClient.send).toHaveBeenCalledWith(
        expect.any(CreateScheduleCommand)
      );
    });
  });

  describe('user update (MODIFY event)', () => {
    it('should update birthday schedule when birthDate or timezoneLocation changes', async () => {
      const oldUserData = {
        ...mockUserDataFromDB,
        birthDate: { S: '1990-01-01' },
        timezoneLocation: { S: 'America/Los_Angeles' },
      };

      const sqsEvent: SQSEvent = {
        Records: [
          {
            body: JSON.stringify({
              newUserData: mockUserDataFromDB,
              oldUserData: oldUserData,
            }),
            receiptHandle: 'receipt-handle-1',
            messageId: 'message-id-1',
            attributes: {},
            messageAttributes: {},
            md5OfBody: 'md5-hash',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:queue-name',
            awsRegion: 'us-east-1',
          } as SQSRecord,
        ],
      };

      mockSchedulerClient.send.mockResolvedValue({} as never);

      await handler(sqsEvent, mockContext);

      expect(mockSchedulerClient.send).toHaveBeenCalledWith(
        expect.any(CreateScheduleCommand)
      );
    });

    it('should not update schedule when irrelevant fields change', async () => {
      const oldUserData = {
        ...mockUserDataFromDB,
        firstName: { S: 'Jane' }, // Only firstName changed
      };

      const sqsEvent: SQSEvent = {
        Records: [
          {
            body: JSON.stringify({
              newUserData: mockUserDataFromDB,
              oldUserData: oldUserData,
            }),
            receiptHandle: 'receipt-handle-1',
            messageId: 'message-id-1',
            attributes: {},
            messageAttributes: {},
            md5OfBody: 'md5-hash',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:queue-name',
            awsRegion: 'us-east-1',
          } as SQSRecord,
        ],
      };

      await handler(sqsEvent, mockContext);

      expect(mockSchedulerClient.send).not.toHaveBeenCalled();
    });
  });

  describe('user deletion (REMOVE event)', () => {
    it('should delete birthday schedule when user is deleted', async () => {
      const sqsEvent: SQSEvent = {
        Records: [
          {
            body: JSON.stringify({
              newUserData: null,
              oldUserData: mockUserDataFromDB,
            }),
            receiptHandle: 'receipt-handle-1',
            messageId: 'message-id-1',
            attributes: {},
            messageAttributes: {},
            md5OfBody: 'md5-hash',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:queue-name',
            awsRegion: 'us-east-1',
          } as SQSRecord,
        ],
      };

      mockSchedulerClient.send.mockResolvedValue({} as never);

      await handler(sqsEvent, mockContext);

      expect(mockSchedulerClient.send).toHaveBeenCalledWith(
        expect.any(DeleteScheduleCommand)
      );
    });
  });
}); 