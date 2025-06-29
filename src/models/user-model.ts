import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { User, CreateUserRequest } from '@/interfaces/user';
import { v4 as uuidv4 } from 'uuid';

export interface IUserModel {
  createUser(userData: CreateUserRequest): Promise<User>;
  getUser(userId: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  deleteUser(userId: string): Promise<void>;
}

export class UserModel implements IUserModel {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;
  private readonly userBirthdayTableName: string;

  constructor() {
    const dynamodbParams: DynamoDBClientConfig = {
      region: process.env.AWS_REGION
    }
    if (process.env.STAGE === 'dev') {
      dynamodbParams.endpoint = 'http://localhost:8000';
    }
    const dynamoClient = new DynamoDBClient(dynamodbParams);
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = process.env.USERS_TABLE_NAME!;
    this.userBirthdayTableName = process.env.USER_BIRTHDAY_TABLE_NAME!;
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    const userId = uuidv4(); 
    const now = new Date().toISOString();

    const user: User = {
      userId,
      firstName: userData.firstName,
      lastName: userData.lastName,
      birthDate: userData.birthDate,
      timezoneLocation: userData.timezoneLocation,
      createdAt: now,
      updatedAt: now,
    };

    // Create user in Users table
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: user,
      })
    );

    // Compute birthDateUTC and add entry to UserBirthday table
    const [year, month, day] = userData.birthDate.split('-').map(Number);
    const birthday = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const userBirthdayEntry = {
      birthday,
      userId,
      firstName: userData.firstName,
      lastName: userData.lastName,
      timezoneLocation: userData.timezoneLocation,
      originalBirthDate: userData.birthDate,
      createdAt: now,
    };

    await this.client.send(
      new PutCommand({
        TableName: this.userBirthdayTableName,
        Item: userBirthdayEntry,
      })
    );

    console.log(`User birthday entry created: ${birthday} for user ${userId}`);

    return user;
  }

  async getUser(userId: string): Promise<User | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { userId },
      })
    );

    return result.Item as User || null;
  }

  async getAllUsers(): Promise<User[]> {
    const result = await this.client.send(
      new ScanCommand({
        TableName: this.tableName,
      })
    );

    return (result.Items || []) as User[];
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    
    if (!user) {
      console.log(`User ${userId} not found, nothing to delete`);
      return;
    }

    // Delete from Users table
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { userId },
      })
    );

    const [year, month, day] = user.birthDate.split('-').map(Number);
    const birthday = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    await this.client.send(
      new DeleteCommand({
        TableName: this.userBirthdayTableName,
        Key: {
          birthday,
          userId
        }
      })
    );

    console.log(`User ${userId} deleted from both Users and UserBirthday tables`);
  }
}


export class UserModelFactory {
  static create(): IUserModel {
    return new UserModel();
  }
} 