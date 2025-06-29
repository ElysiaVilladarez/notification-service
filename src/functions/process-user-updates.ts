import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { SchedulerClient, CreateScheduleCommand, DeleteScheduleCommand } from '@aws-sdk/client-scheduler';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { SQSClient, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { TUserDataFromDB } from '@/interfaces/user';
import { TBirthdaySchedule, TSQSMessage } from '@/interfaces/schedules';
import { calculateNextBirthdayTime } from '@/utils/helpers';


export const handler = async (event: SQSEvent, context: Context) => {
  if (process.env.STAGE === 'dev') {
    event.Records = event.Records.map(transformStreamRecordToSQSMessage) as SQSRecord[];
  }
  for (const record of event.Records) {
    try {
      await processRecord(record);
      if (process.env.STAGE !== 'dev') {
        await deleteSQSMessage(record);
      }
    } catch (error) {
      console.error(`Error processing record:`, error);
    }
  }
};

async function processRecord(record: SQSRecord): Promise<void> {
  const message: TSQSMessage = JSON.parse(record.body);
  const eventName = determineEventName(message);

  switch (eventName) {
    case 'INSERT':
      if (message.newUserData) {
        await handleUserCreated(message.newUserData);
      }
      break;
    case 'MODIFY':
      if (message.newUserData) {
        await handleUserUpdated(message.oldUserData, message.newUserData);
      }
      break;
    case 'REMOVE':
      if (message.oldUserData) {
        await handleUserDeleted(message.oldUserData);
      }
      break;
    default:
      console.log(`Unknown event type: ${eventName}`);
  }
}

async function deleteSQSMessage(message: SQSRecord): Promise<void> {
  const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
  await sqsClient.send(new DeleteMessageCommand({
    QueueUrl: process.env.USER_UPDATE_QUEUE_URL,
    ReceiptHandle: message.receiptHandle,
  }));
}

async function handleUserCreated(userData: TUserDataFromDB): Promise<void> {
  console.log(`Handle User created: ${userData.userId.S}`);
  await scheduleBirthdayEvent(userData);
}

async function handleUserUpdated(oldUserData: TUserDataFromDB | null, newUserData: TUserDataFromDB): Promise<void> {
  console.log(`Handle User updated: ${newUserData.userId.S}`);
  
  if (oldUserData && 
      (oldUserData.birthDate.S !== newUserData.birthDate.S || 
      oldUserData.timezoneLocation.S !== newUserData.timezoneLocation.S)) {
    
    if (oldUserData) {
      await deleteSchedulerSchedule('birthday', oldUserData.userId.S);
    }
    
    await scheduleBirthdayEvent(newUserData);
  }
}

async function handleUserDeleted(userData: TUserDataFromDB): Promise<void> {
  console.log(`Handle User deleted: ${userData.userId.S}`);
  await deleteSchedulerSchedule('birthday', userData.userId.S);
}

async function scheduleBirthdayEvent(userData: TUserDataFromDB): Promise<void> {
  try {
    const scheduleTime = calculateNextBirthdayTime(
      userData.birthDate.S,
      userData.timezoneLocation.S
    );

    if (!scheduleTime) {
      console.log(`Could not calculate birthday time for user ${userData.userId.S}`);
      return;
    }
    const birthdaySchedule: TBirthdaySchedule = {
      userId: userData.userId.S,
      firstName: userData.firstName.S,
      lastName: userData.lastName.S,
      birthDate: userData.birthDate.S,
      timezoneLocation: userData.timezoneLocation.S,
      scheduleTime: scheduleTime
    };

    await createSchedulerSchedule('birthday', birthdaySchedule);

    console.log(`Birthday scheduled for user ${userData.userId.S} at ${scheduleTime}`);
  } catch (error) {
    console.error(`Error scheduling birthday for user ${userData.userId.S}:`, error);
    throw error;
  }
}

async function createSchedulerSchedule(notificationType: string, schedule: TBirthdaySchedule): Promise<string> {
  const scheduleName = `${notificationType}-${schedule.userId}`;
  
  // If stage is dev, invoke lambda directly instead of creating scheduler
  if (process.env.STAGE === 'dev') {
    console.log('Dev stage detected, invoking lambda directly instead of creating scheduler');
    
    const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION, endpoint: 'http://localhost:3002' });
    
    const lambdaParams = {
      FunctionName: `${process.env.SERVICE_NAME}-${process.env.STAGE}-sendGreeting`,
      InvocationType: 'Event' as const,
      Payload: JSON.stringify({
        detail: {
          userId: schedule.userId,
          firstName: schedule.firstName,
          lastName: schedule.lastName,
          birthDate: schedule.birthDate,
          timezoneLocation: schedule.timezoneLocation,
          notificationType: notificationType,
        }
      }),
    };
    
    console.log('Invoking lambda directly:', lambdaParams);
    await lambdaClient.send(new InvokeCommand(lambdaParams));
    console.log(`Lambda invoked directly for user ${schedule.userId}`);
    
    return scheduleName;
  }
  
  // For non-dev stages, create EventBridge Scheduler schedule
  const schedulerClient = new SchedulerClient();
  const params = {
    Name: scheduleName,
    ScheduleExpression: `at(${schedule.scheduleTime})`,
    FlexibleTimeWindow: {
      Mode: 'OFF' as const,
    },
    Target: {
      Arn: `arn:aws:lambda:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:function:${process.env.SERVICE_NAME}-${process.env.STAGE}-sendGreeting`,
      RoleArn: `arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:role/${process.env.SERVICE_NAME}-scheduler-execution-role-${process.env.STAGE}`,
      Input: JSON.stringify({
        userId: schedule.userId,
        firstName: schedule.firstName,
        lastName: schedule.lastName,
        birthDate: schedule.birthDate,
        timezoneLocation: schedule.timezoneLocation,
        notificationType: notificationType,
      }),
    },
  };

  console.log('Creating scheduler schedule:', params);

  await schedulerClient.send(new CreateScheduleCommand(params));
  return scheduleName;
}

async function deleteSchedulerSchedule(notificationType: string, userId: string): Promise<void> {
  const schedulerClient = new SchedulerClient();
  try {
      const deleteParams = {
        Name: `${notificationType}-${userId}`,
      };
      await schedulerClient.send(new DeleteScheduleCommand(deleteParams));
      console.log(`Scheduler schedule deleted for user ${userId}`);
  } catch (error) {
    console.error(`Error deleting scheduler schedule for user ${userId}:`, error);
  }
}

function transformStreamRecordToSQSMessage(record: any): {body: string} {
  const dynamodbData = {
    newUserData: record.dynamodb.NewImage,
    oldUserData: record.dynamodb.OldImage
  }
  return {
    body: JSON.stringify(dynamodbData)
  }
}

function determineEventName(message: TSQSMessage): string {
  if (message.newUserData && !message.oldUserData) {
    return 'INSERT';
  } else if (!message.newUserData) {
    return 'REMOVE';
  } else {
    return 'MODIFY';
  }
}