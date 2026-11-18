import calendar from './2027-holidays.json';

const dayMs = 86400000;
const midnight = (date: string) => Date.parse(`${date}T00:00:00+08:00`);
const dateLabel = (date: string) => date.replace(/^(\d+)-(\d+)-(\d+)$/, '$1年$2月$3日');

export interface HolidayCountdown {
  name: string;
  dates: string;
  remaining: string;
}

export function getHolidayCountdown(now: Date): HolidayCountdown | null {
  const timestamp = now.getTime();
  const holiday = calendar.holidays.find((item) => timestamp < midnight(item.end) + dayMs);
  if (!holiday) return null;
  const seconds = Math.max(0, Math.ceil((midnight(holiday.start) - timestamp) / 1000));
  const days = Math.floor(seconds / 86400);
  const clock = [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
  const duration = Math.round((midnight(holiday.end) - midnight(holiday.start)) / dayMs) + 1;
  return {
    name: holiday.name,
    dates: `${dateLabel(holiday.start)}${holiday.start === holiday.end ? '' : ` 至 ${holiday.end.slice(5).replace('-', '月')}日`} · ${duration}天`,
    remaining: seconds === 0 ? '假期进行中 🎉' : days > 0 ? `还有 ${days} 天` : `还有 ${clock}`,
  };
}
