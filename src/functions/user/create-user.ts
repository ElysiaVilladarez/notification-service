import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UserModelFactory } from '@/models/user-model';
import { CreateUserRequest } from '@/interfaces/user';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const result: APIGatewayProxyResult = {
    statusCode: 400,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST',
    },
    body: '{}',
  }

  try {
    
    const userData: CreateUserRequest = JSON.parse(event.body || '{}');
    console.log('Creating new user...', userData);
    
    if (!userData.firstName || !userData.lastName || !userData.birthDate || !userData.timezoneLocation) {
      result.body = JSON.stringify({
          message: 'firstName, lastName, birthDate, and timezoneLocation are required',
      });
      return result;
    }
    
    if (userData.firstName.length > 200 || userData.lastName.length > 200) {
      result.body = JSON.stringify({
          message: 'firstName and lastName must be 200 characters or less',
      });
      return result;
    }
    
    const birthDate = new Date(userData.birthDate);
    if (isNaN(birthDate.getTime())) {
      result.body = JSON.stringify({
          message: 'birthDate must be a valid date string',
      });
      return result;
    }

    // TODO: check for timezoneLocation validity
    
    const userModel = UserModelFactory.create();
    const newUser = await userModel.createUser(userData);
    
    console.log(`User created successfully: ${newUser.userId}`);
    
    result.statusCode = 201;
    result.body = JSON.stringify({
        message: 'User created successfully',
        user: newUser,
      });
    return result;
  } catch (error) {
    console.error('Error in createUser function:', error);
    
    result.statusCode = 500;
    result.body = JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    return result;
  }
}; 