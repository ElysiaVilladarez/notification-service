export const calculateNextBirthdayTime = (birthDate: string, timezoneLocation: string): string => {
  const [year, month, day] = birthDate.split('-').map(Number);
  const now = new Date();
  const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezoneLocation }));
  const thisYearBirthday = new Date(userTime.getFullYear(), month - 1, day, parseInt(process.env.BIRTHDAY_NOTIFICATION_HOUR || '0'), parseInt(process.env.BIRTHDAY_NOTIFICATION_MINUTE || '0'), 0);
  if (thisYearBirthday <= userTime) {
    thisYearBirthday.setFullYear(thisYearBirthday.getFullYear() + 1);
  }
  const timezoneOffsetMilli = userTime.getTimezoneOffset() * 60000;
  const utcBirthdayTime = new Date(thisYearBirthday.getTime() + timezoneOffsetMilli);
  return utcBirthdayTime.toISOString().replace('.000Z', '');
}