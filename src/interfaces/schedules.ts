import { TUserDataFromDB } from "./user";

export type TSQSMessage = {
  newUserData: TUserDataFromDB | null;
  oldUserData: TUserDataFromDB | null;
}

export type TBirthdaySchedule = {
  userId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  timezoneLocation: string;
  scheduleTime: string;
}