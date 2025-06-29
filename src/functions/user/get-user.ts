import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UserModelFactory } from '@/models/user-model';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const result: APIGatewayProxyResult = {
    statusCode: 400,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET',
    },
    body: '{}',
  }
  try {
    console.log('Getting user...');
    
    const userId = event.pathParameters?.userId;
    
    if (!userId) {
      result.body = JSON.stringify({
          message: 'userId is required in path parameters',
        });
      return result;
    }
    
    const userModel = UserModelFactory.create();
    const user = await userModel.getUser(userId);
    
    if (!user) {
      result.body = JSON.stringify({
          message: 'User not found',
        });
      return result;
    }
    
    console.log(`User retrieved successfully: ${userId}`);
    
    result.statusCode = 200;
    result.body = JSON.stringify({
        message: 'User retrieved successfully',
        user,
      });
    return result;
  } catch (error) {
    console.error('Error in getUser function:', error);
    
    result.statusCode = 500;
    result.body = JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    return result;
  }
}; 