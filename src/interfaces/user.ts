export interface User {
  userId: string;
  firstName: string;
  lastName: string;
  birthDate: string; // ISO date string
  timezoneLocation: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  birthDate: string;
  timezoneLocation: string;
}

export interface NotificationEvent {
  userId: string;
  firstName: string;
  lastName: string;
  timezoneLocation: string;
  notificationType: 'birthday';
  scheduledTime: string;
} 

export type TUserDataFromDB = {
  userId: { S: string };
  firstName: { S: string };
  lastName: { S: string };
  birthDate: { S: string };
  timezoneLocation: { S: string };
}