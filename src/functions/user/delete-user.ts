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
      'Access-Control-Allow-Methods': 'DELETE',
    },
    body: '{}',
  }
  try {
    console.log('Deleting user...');
    
    const userId = event.pathParameters?.userId;
    
    if (!userId) {
      result.body = JSON.stringify({
          message: 'userId is required in path parameters',
        });
      return result;
    }
    
    const userModel = UserModelFactory.create();
    
    const existingUser = await userModel.getUser(userId);
    
    if (!existingUser) {
      result.statusCode = 404;
      result.body = JSON.stringify({
          message: 'User not found',
        });
      return result;
    }
    
    // Delete the user
    await userModel.deleteUser(userId);
    
    console.log(`User deleted successfully: ${userId}`);
    
    result.statusCode = 200;
    result.body = JSON.stringify({
        message: 'User deleted successfully',
        userId: userId,
        deletedAt: new Date().toISOString(),
      });
    return result;
  } catch (error) {
    console.error('Error in deleteUser function:', error);
    
    result.statusCode = 500;
    result.body = JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    return result;
  }
}; 