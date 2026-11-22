import {
  dailyPointTaskIds,
  type DailyPointTasks,
  type SignMonth,
  type SignResult,
} from '@/domain/sign-in';

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
function long(value: unknown): number {
  return number(typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value);
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

export function decodeDailyPointTasks(raw: unknown): DailyPointTasks {
  const value = record(raw);
  const serverNow = long(value.serverNow);
  const refreshAt = long(value.refreshAt);
  if (refreshAt <= serverNow || !Array.isArray(value.tasks)) throw new Error('积分任务数据异常');
  const seen = new Set<string>();
  const tasks: DailyPointTasks['tasks'] = [];
  for (const rawTask of value.tasks as unknown[]) {
    const task = record(rawTask);
    if (typeof task.id !== 'string') throw new Error('积分任务编号异常');
    const id = dailyPointTaskIds.find((id) => id === task.id);
    if (!id) continue;
    const { state, detail } = task;
    const progress = task.progress === null ? null : number(task.progress);
    const goal = task.goal === null ? null : number(task.goal);
    if (
      seen.has(id) ||
      (state !== 'ready' && state !== 'waiting' && state !== 'done' && state !== 'conditional') ||
      (detail !== null && typeof detail !== 'string') ||
      (goal === null ? progress !== null : goal === 0 || progress === null || progress > goal)
    ) {
      throw new Error('积分任务状态异常');
    }
    seen.add(id);
    tasks.push({ id, state, progress, goal, earned: long(task.earned), detail });
  }
  return { serverNow, refreshAt, tasks };
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
