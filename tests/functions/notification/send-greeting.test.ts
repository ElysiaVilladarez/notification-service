import { EventBridgeEvent } from 'aws-lambda';
import { handler } from '../../../src/functions/notification/send-greeting';
import axios from 'axios';

jest.mock('axios');
const MockedAxios = axios as jest.Mocked<typeof axios>;

describe('sendGreeting Lambda Function', () => {
  beforeEach(() => {
    process.env.PIPEDREAM_BASE_URL = 'https://eolz8xqj1234567890.m.pipedream.net';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('successful notification sending', () => {
    it('should send birthday notification to Pipedream successfully', async () => {
      const event: EventBridgeEvent<'BirthdayNotification', any> = {
        version: '0',
        id: 'test-event-id',
        'detail-type': 'BirthdayNotification',
        source: 'aws.scheduler',
        account: '123456789012',
        time: '2024-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: ['arn:aws:scheduler:us-east-1:123456789012:schedule/birthday-user123'],
        detail: {
          userId: 'user123',
          firstName: 'John',
          lastName: 'Doe',
          birthDate: '1990-05-15',
          timezoneLocation: 'America/New_York',
          notificationType: 'birthday',
        },
      };

      MockedAxios.post.mockResolvedValue({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      await handler(event);

      expect(MockedAxios.post).toHaveBeenCalledWith(
        'https://eolz8xqj1234567890.m.pipedream.net/bday',
        {
          userId: 'user123',
          firstName: 'John',
          lastName: 'Doe',
          birthDate: '1990-05-15',
          timezoneLocation: 'America/New_York',
          notificationType: 'birthday',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
    });
  });

  describe('error handling', () => {
    it('should handle missing PIPEDREAM_BASE_URL gracefully', async () => {
      delete process.env.PIPEDREAM_BASE_URL;

      const event: EventBridgeEvent<'BirthdayNotification', any> = {
        version: '0',
        id: 'test-event-id',
        'detail-type': 'BirthdayNotification',
        source: 'aws.scheduler',
        account: '123456789012',
        time: '2024-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: ['arn:aws:scheduler:us-east-1:123456789012:schedule/birthday-user123'],
        detail: {
          userId: 'user123',
          firstName: 'John',
          lastName: 'Doe',
          birthDate: '1990-05-15',
          timezoneLocation: 'America/New_York',
          notificationType: 'birthday',
        },
      };

      await handler(event);

      expect(MockedAxios.post).not.toHaveBeenCalled();
    });

    it('should handle Pipedream API errors', async () => {
      const event: EventBridgeEvent<'BirthdayNotification', any> = {
        version: '0',
        id: 'test-event-id',
        'detail-type': 'BirthdayNotification',
        source: 'aws.scheduler',
        account: '123456789012',
        time: '2024-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: ['arn:aws:scheduler:us-east-1:123456789012:schedule/birthday-user123'],
        detail: {
          userId: 'user123',
          firstName: 'John',
          lastName: 'Doe',
          birthDate: '1990-05-15',
          timezoneLocation: 'America/New_York',
          notificationType: 'birthday',
        },
      };

      const error = new Error('Pipedream API error');
      MockedAxios.post.mockRejectedValue(error);

      await expect(handler(event)).rejects.toThrow('Pipedream API error');
    });

    it('should handle network timeout errors', async () => {
      const event: EventBridgeEvent<'BirthdayNotification', any> = {
        version: '0',
        id: 'test-event-id',
        'detail-type': 'BirthdayNotification',
        source: 'aws.scheduler',
        account: '123456789012',
        time: '2024-01-01T00:00:00Z',
        region: 'us-east-1',
        resources: ['arn:aws:scheduler:us-east-1:123456789012:schedule/birthday-user123'],
        detail: {
          userId: 'user123',
          firstName: 'John',
          lastName: 'Doe',
          birthDate: '1990-05-15',
          timezoneLocation: 'America/New_York',
          notificationType: 'birthday',
        },
      };

      const error = new Error('timeout of 10000ms exceeded');
      MockedAxios.post.mockRejectedValue(error);

      await expect(handler(event)).rejects.toThrow('timeout of 10000ms exceeded');
    });
  });
}); 