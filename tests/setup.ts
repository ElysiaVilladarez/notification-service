process.env.STAGE = 'test';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCOUNT_ID = '123456789012';
process.env.SERVICE_NAME = 'notification-service';
process.env.USERS_TABLE_NAME = 'notification-service-users-test';
process.env.USER_UPDATE_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/notification-service-user-update-queue-test';
process.env.BIRTHDAY_NOTIFICATION_HOUR = '9';
process.env.BIRTHDAY_NOTIFICATION_MINUTE = '0';
process.env.PIPEDREAM_BASE_URL = 'https://eolz8xqj1234567890.m.pipedream.net';

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@aws-sdk/client-scheduler');
jest.mock('@aws-sdk/client-sqs');
jest.mock('axios');

export const mockUser = {
  userId: 'user123',
  firstName: 'John',
  lastName: 'Doe',
  birthDate: '1990-05-15',
  timezoneLocation: 'America/New_York',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

export const mockCreateUserRequest = {
  firstName: 'John',
  lastName: 'Doe',
  birthDate: '1990-05-15',
  timezoneLocation: 'America/New_York'
};

export const mockUserDataFromDB = {
  userId: { S: 'user123' },
  firstName: { S: 'John' },
  lastName: { S: 'Doe' },
  birthDate: { S: '1990-05-15' },
  timezoneLocation: { S: 'America/New_York' }
}; 