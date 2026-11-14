export interface WorkSchedule {
  start: string;
  end: string;
  lunch: string;
  salary: number;
  days: number;
  workdayType: 'single' | 'double' | 'mixed';
  bigWeek: boolean;
  anchor: string;
}
export const defaultSchedule: WorkSchedule = {
  start: '08:30',
  end: '17:30',
  lunch: '12:00',
  salary: 0,
  days: 22,
  workdayType: 'double',
  bigWeek: true,
  anchor: '2026-11-09',
};
export const timeMinute = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export function validSchedule(value: WorkSchedule): boolean {
  return (
    [value.start, value.end, value.lunch].every((v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v)) &&
    timeMinute(value.end) > timeMinute(value.start) &&
    timeMinute(value.lunch) >= timeMinute(value.start) &&
    timeMinute(value.lunch) <= timeMinute(value.end) &&
    Number.isFinite(value.salary) &&
    value.salary >= 0 &&
    Number.isInteger(value.days) &&
    value.days >= 1 &&
    value.days <= 31 &&
    ['single', 'double', 'mixed'].includes(value.workdayType) &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.anchor)
  );
}
export function isWorkDay(date: Date, schedule: WorkSchedule): boolean {
  if (date.getDay() === 0) return false;
  if (date.getDay() !== 6 || schedule.workdayType === 'single') return true;
  if (schedule.workdayType === 'double') return false;
  const [year, month, day] = schedule.anchor.split('-').map(Number);
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const anchor = new Date(year!, month! - 1, day!);
  const monday = Date.UTC(year!, month! - 1, day! - ((anchor.getDay() + 6) % 7));
  return Math.abs(Math.floor((utc - monday) / (7 * 86400000))) % 2 === 0
    ? schedule.bigWeek
    : !schedule.bigWeek;
}
