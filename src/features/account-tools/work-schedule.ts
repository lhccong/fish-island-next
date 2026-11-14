import { defaultSchedule, validSchedule, type WorkSchedule } from '@/domain/account-tools';
export const scheduleKey = 'fish-island:work-schedule';
export function readSchedule(): WorkSchedule {
  try {
    const value = JSON.parse(localStorage.getItem(scheduleKey) ?? 'null') as WorkSchedule | null;
    if (value && validSchedule(value)) return value;
    const old = JSON.parse(localStorage.getItem('moYuData') ?? 'null') as Record<
      string,
      unknown
    > | null;
    if (old) {
      const migrated = {
        ...defaultSchedule,
        start: String(old.startTime ?? defaultSchedule.start),
        end: String(old.endTime ?? defaultSchedule.end),
        lunch: String(old.lunchTime ?? defaultSchedule.lunch),
        salary: Number(old.monthlySalary ?? 0),
        workdayType: (old.workdayType as WorkSchedule['workdayType']) ?? 'double',
        bigWeek: old.currentWeekType !== 'small',
      };
      if (validSchedule(migrated)) return migrated;
    }
  } catch {
    /* 旧设置损坏时使用默认值。 */
  }
  return defaultSchedule;
}
