import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../../../src/functions/user/create-user';
import { UserModelFactory } from '../../../src/models/user-model';
import { mockCreateUserRequest, mockUser } from '../../setup';

jest.mock('../../../src/models/user-model');
const MockedUserModelFactory = UserModelFactory as jest.Mocked<typeof UserModelFactory>;

describe('createUser Lambda Function', () => {
  let mockUserModelInstance: jest.Mocked<any>;

  beforeEach(() => {
    mockUserModelInstance = {
      createUser: jest.fn(),
    };

    MockedUserModelFactory.create.mockReturnValue(mockUserModelInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('successful user creation', () => {
    it('should create a user successfully with valid data', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify(mockCreateUserRequest),
        headers: { 'Content-Type': 'application/json' },
      } as any;

      mockUserModelInstance.createUser.mockResolvedValue(mockUser);

      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body)).toEqual({
        message: 'User created successfully',
        user: mockUser,
      });
      expect(mockUserModelInstance.createUser).toHaveBeenCalledWith(mockCreateUserRequest);
    });
  });

  describe('error handling', () => {
    it('should return error for invalid JSON body', async () => {
      const event: APIGatewayProxyEvent = {
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
    });

    it('should return 400 for missing required fields', async () => {
      const invalidUserData = {
        firstName: 'John',
        // Missing lastName, birthDate, timezoneLocation
      };

      const event: APIGatewayProxyEvent = {
        body: JSON.stringify(invalidUserData),
        headers: { 'Content-Type': 'application/json' },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        message: 'firstName, lastName, birthDate, and timezoneLocation are required',
      });
    });

    it('should return 400 for invalid birth date format', async () => {
      const invalidUserData = {
        ...mockCreateUserRequest,
        birthDate: 'invalid-date',
      };

      const event: APIGatewayProxyEvent = {
        body: JSON.stringify(invalidUserData),
        headers: { 'Content-Type': 'application/json' },
      } as any;

      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        message: 'birthDate must be a valid date string',
      });
    });

    it('should return 500 when UserModel.createUser throws an error', async () => {
      const event: APIGatewayProxyEvent = {
        body: JSON.stringify(mockCreateUserRequest),
        headers: { 'Content-Type': 'application/json' },
      } as any;

      const error = new Error('Database error');
      mockUserModelInstance.createUser.mockRejectedValue(error);

      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Internal server error',
        error: 'Database error',
      });
    });
  });
}); 