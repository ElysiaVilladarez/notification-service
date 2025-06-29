import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../../../src/functions/user/get-user';
import { UserModelFactory } from '../../../src/models/user-model';
import { mockUser } from '../../setup';

jest.mock('../../../src/models/user-model');
const MockedUserModelFactory = UserModelFactory as jest.Mocked<typeof UserModelFactory>;

describe('getUser Lambda Function', () => {
  let mockUserModelInstance: jest.Mocked<any>;

  beforeEach(() => {
    mockUserModelInstance = {
      getUser: jest.fn(),
    };

    MockedUserModelFactory.create.mockReturnValue(mockUserModelInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('successful user retrieval', () => {
    it('should get a user successfully with valid userId', async () => {
      const event: APIGatewayProxyEvent = {
        pathParameters: { userId: 'user123' },
        headers: { 'Content-Type': 'application/json' },
      } as any;

      mockUserModelInstance.getUser.mockResolvedValue(mockUser);

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        message: 'User retrieved successfully',
        user: mockUser,
      });
      expect(mockUserModelInstance.getUser).toHaveBeenCalledWith('user123');
    });
  });

  describe('error handling', () => {
    it('should return 400 for missing userId parameter', async () => {
      const event: APIGatewayProxyEvent = {
        pathParameters: {},
        headers: { 'Content-Type': 'application/json' },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        message: 'userId is required in path parameters',
      });
    });

    it('should return error when user is not found', async () => {
      const event: APIGatewayProxyEvent = {
        pathParameters: { userId: 'nonexistent' },
        headers: { 'Content-Type': 'application/json' },
      } as any;

      mockUserModelInstance.getUser.mockResolvedValue(null);

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        message: 'User not found',
      });
    });

    it('should return 500 when UserModel.getUser throws an error', async () => {
      const event: APIGatewayProxyEvent = {
        pathParameters: { userId: 'user123' },
        headers: { 'Content-Type': 'application/json' },
      } as any;

      const error = new Error('Database error');
      mockUserModelInstance.getUser.mockRejectedValue(error);

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Internal server error',
        error: 'Database error',
      });
    });
  });
}); 