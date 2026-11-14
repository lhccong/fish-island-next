import type { SignMonth, SignResult } from '@/domain/sign-in';

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('签到服务返回的数据格式异常');
  return value as Record<string, unknown>;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new Error('签到服务返回的数值异常');
  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('签到服务返回的状态异常');
  return value;
}
export function decodeResult(raw: unknown): SignResult {
  const value = record(raw);
  return {
    totalPoints: number(value.totalPoints),
    bonusPoints: number(value.bonusPoints),
    nextDayBonus: number(value.nextDayBonus),
  };
}
export function decodeMonth(raw: unknown): SignMonth {
  const value = record(raw);
  const year = number(value.year),
    month = number(value.month);
  if (year < 1900 || year > 9999 || month < 1 || month > 12 || !Array.isArray(value.days))
    throw new Error('签到日历数据异常');
  const dates = new Set<string>();
  return {
    year,
    month,
    continuousDays: number(value.continuousDays),
    totalSignInDays: number(value.totalSignInDays),
    currentPoints: number(value.currentPoints),
    remainMakeUpCount: number(value.remainMakeUpCount),
    days: value.days
      .map((raw: unknown) => {
        const day = record(raw);
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
        if (
          number(day.day) < 1 ||
          number(day.day) > new Date(year, month, 0).getDate() ||
          day.date !== date ||
          dates.has(date)
        )
          throw new Error('签到日期数据异常');
        dates.add(date);
        if (day.signType !== null && day.signType !== 1 && day.signType !== 2)
          throw new Error('签到类型异常');
        return {
          day: number(day.day),
          date,
          rewardPoints: number(day.rewardPoints),
          signed: boolean(day.signed),
          isToday: boolean(day.isToday),
          canMakeUp: boolean(day.canMakeUp),
          signType: day.signType,
        };
      })
      .sort((a, b) => a.day - b.day),
  };
}
