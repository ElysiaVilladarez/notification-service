import { EventBridgeEvent } from 'aws-lambda';
import { TBirthdayEventDetail } from '@/interfaces/events';
import axios from 'axios';

export const handler = async (
  event: EventBridgeEvent<'BirthdayNotification', TBirthdayEventDetail>
): Promise<void> => {
  try {
    console.log('Received birthday event:', JSON.stringify(event, null, 2));

    const { userId, firstName, lastName, birthDate, timezoneLocation } = event.detail;
    const pipedreamData = {
      userId,
      firstName,
      lastName,
      birthDate,
      timezoneLocation,
      notificationType: 'birthday'
    };

    if (process.env.PIPEDREAM_BASE_URL) {
      const response = await axios.post(`${process.env.PIPEDREAM_BASE_URL}/bday`, pipedreamData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      console.log(`Birthday notification sent to Pipedream for user ${userId}`);
      console.log(response.data);
    } else {
      console.warn('PIPEDREAM_BASE_URL not configured, skipping Pipedream notification');
    }
  } catch (error) {
    console.error('Error handling birthday event:', error);
    throw error;
  }
}; 