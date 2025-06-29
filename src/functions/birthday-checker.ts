import { ScheduledEvent, Context } from 'aws-lambda';
import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

interface UserBirthdayRecord {
  birthday: string;
  userId: string;
  firstName: string;
  lastName: string;
  timezoneLocation: string;
  originalBirthDate: string;
  createdAt: string;
}

export const handler = async (event: ScheduledEvent, context: Context) => {
  console.log('Birthday checker started at:', new Date().toISOString());
  
  try {
    const currentTime = new Date();
    const targetDateUTC = formatDateToMMDD(currentTime);
    
    console.log(`Checking for birthdays on UTC date: ${targetDateUTC}`);
    
    const birthdayUsers = await getUsersWithBirthdayToday(targetDateUTC);
    
    if (birthdayUsers.length === 0) {
      console.log('No users with birthdays found for today');
      return;
    }
    
    console.log(`Found ${birthdayUsers.length} users with birthdays today`);
    
    for (const user of birthdayUsers) {
      const shouldNotify = await checkIfShouldNotify(user, currentTime);
      
      if (shouldNotify) {
        console.log(`Triggering birthday notification for user ${user.userId} (${user.firstName} ${user.lastName})`);
        await triggerBirthdayNotification(user);
      }
    }
    
    console.log('Birthday checker completed successfully');
  } catch (error) {
    console.error('Error in birthday checker:', error);
    throw error;
  }
};

async function getUsersWithBirthdayToday(birthday: string): Promise<UserBirthdayRecord[]> {
  const dynamodbParams: DynamoDBClientConfig = {
    region: process.env.AWS_REGION
  };
  
  if (process.env.STAGE === 'dev') {
    dynamodbParams.endpoint = 'http://localhost:8000';
  }
  
  const dynamoClient = new DynamoDBClient(dynamodbParams);
  const client = DynamoDBDocumentClient.from(dynamoClient);

  const birthdayDates = [
    getPreviousDay(birthday),
    birthday,
    getNextDay(birthday)
  ];

  const allUsers: UserBirthdayRecord[] = [];

  for (const birthdayDate of birthdayDates) {
    try {
      const result = await client.send(
        new QueryCommand({
          TableName: process.env.USER_BIRTHDAY_TABLE_NAME,
          KeyConditionExpression: 'birthday = :birthday',
          ExpressionAttributeValues: {
            ':birthday': birthdayDate
          }
        })
      );
      
      if (result.Items) {
        allUsers.push(...(result.Items as UserBirthdayRecord[]));
      }
    } catch (error) {
      console.error(`Error querying birthday ${birthdayDate}:`, error);
    }
  }
  
  return allUsers;
}

function getPreviousDay(birthday: string): string {
  const [month, day] = birthday.split('-').map(Number);
  const currentYear = new Date().getUTCFullYear();
  const date = new Date(currentYear, month - 1, day);
  date.setDate(date.getDate() - 1);
  
  const prevMonth = String(date.getMonth() + 1).padStart(2, '0');
  const prevDay = String(date.getDate()).padStart(2, '0');
  return `${prevMonth}-${prevDay}`;
}

function getNextDay(birthday: string): string {
  const [month, day] = birthday.split('-').map(Number);
  const currentYear = new Date().getUTCFullYear();
  const date = new Date(currentYear, month - 1, day);
  date.setDate(date.getDate() + 1);
  
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getDate()).padStart(2, '0');
  return `${nextMonth}-${nextDay}`;
}

async function checkIfShouldNotify(user: UserBirthdayRecord, currentTime: Date): Promise<boolean> {
  try {
    const notificationHour = parseInt(process.env.BIRTHDAY_NOTIFICATION_HOUR || '9');
    const notificationMinute = parseInt(process.env.BIRTHDAY_NOTIFICATION_MINUTE || '0');

    const [month, day] = user.birthday.split('-').map(Number);
    
    const currentTimeInUserTz = new Date(currentTime.toLocaleString('en-US', { timeZone: user.timezoneLocation }));
    
    const userNotificationTime = new Date(currentTimeInUserTz);
    userNotificationTime.setMonth(month - 1);
    userNotificationTime.setDate(day);
    userNotificationTime.setHours(notificationHour);
    userNotificationTime.setMinutes(notificationMinute);
    userNotificationTime.setSeconds(0);
    userNotificationTime.setMilliseconds(0);
    
    const timeDifferenceMs = Math.abs(currentTimeInUserTz.getTime() - userNotificationTime.getTime());
    const timeDifferenceMinutes = timeDifferenceMs / (1000 * 60);
    
    console.log(`User ${user.userId}: Birthday ${user.birthday}, TZ: ${user.timezoneLocation}, Current in user TZ: ${currentTimeInUserTz.toISOString()}, Notification in user TZ: ${userNotificationTime.toISOString()}, Difference: ${timeDifferenceMinutes.toFixed(2)} minutes`);
    
    return timeDifferenceMinutes <= 5;
  } catch (error) {
    console.error(`Error checking notification time for user ${user.userId}:`, error);
    return false;
  }
}

async function triggerBirthdayNotification(user: UserBirthdayRecord): Promise<void> {
  try {
    const lambdaClient = new LambdaClient({ 
      region: process.env.AWS_REGION,
      ...(process.env.STAGE === 'dev' && { endpoint: 'http://localhost:3002' })
    });
    
    const payload = {
      detail: {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        birthDate: user.originalBirthDate,
        timezoneLocation: user.timezoneLocation,
        notificationType: 'birthday'
      }
    };
    
    const params = {
      FunctionName: `${process.env.SERVICE_NAME}-${process.env.STAGE}-sendGreeting`,
      InvocationType: 'Event' as const,
      Payload: JSON.stringify(payload)
    };
    
    await lambdaClient.send(new InvokeCommand(params));
    console.log(`Birthday notification triggered for user ${user.userId}`);
  } catch (error) {
    console.error(`Error triggering notification for user ${user.userId}:`, error);
    throw error;
  }
}

function formatDateToMMDD(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${month}-${day}`;
} 