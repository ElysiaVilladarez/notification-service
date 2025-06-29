import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../../../src/functions/user/delete-user';
import { UserModelFactory } from '../../../src/models/user-model';

jest.mock('../../../src/models/user-model');
const MockedUserModelFactory = UserModelFactory as jest.Mocked<typeof UserModelFactory>;

describe('deleteUser Lambda Function', () => {
  let mockUserModelInstance: jest.Mocked<any>;

  beforeEach(() => {
    mockUserModelInstance = {
      deleteUser: jest.fn(),
      getUser: jest.fn(),
    };

    MockedUserModelFactory.create.mockReturnValue(mockUserModelInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('successful user deletion', () => {
    it('should delete a user successfully with valid userId', async () => {
      const event: APIGatewayProxyEvent = {
        pathParameters: { userId: 'user123' },
        headers: { 'Content-Type': 'application/json' },
      } as any;

      mockUserModelInstance.getUser.mockResolvedValue({ userId: 'user123' });
      mockUserModelInstance.deleteUser.mockResolvedValue(undefined);

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        deletedAt: expect.any(String),
        message: 'User deleted successfully',
        userId: 'user123'
      });
      expect(mockUserModelInstance.getUser).toHaveBeenCalledWith('user123');
      expect(mockUserModelInstance.deleteUser).toHaveBeenCalledWith('user123');
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

    it('should return 404 when user is not found', async () => {
      const event: APIGatewayProxyEvent = {
        pathParameters: { userId: 'nonexistent' },
        headers: { 'Content-Type': 'application/json' },
      } as any;

      mockUserModelInstance.getUser.mockResolvedValue(null);

      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({
        message: 'User not found',
      });
      expect(mockUserModelInstance.deleteUser).not.toHaveBeenCalled();
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

    it('should return 500 when UserModel.deleteUser throws an error', async () => {
      const event: APIGatewayProxyEvent = {
        pathParameters: { userId: 'user123' },
        headers: { 'Content-Type': 'application/json' },
      } as any;

      mockUserModelInstance.getUser.mockResolvedValue({ userId: 'user123' });
      const error = new Error('Delete error');
      mockUserModelInstance.deleteUser.mockRejectedValue(error);

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Internal server error',
        error: 'Delete error',
      });
    });
  });
}); 