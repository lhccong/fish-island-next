import type { SignMonth } from '@/domain/sign-in';
import styles from './SignIn.module.css';

export function SignCalendar({
  data,
  disabled,
  onMakeUp,
}: {
  data: SignMonth;
  disabled: boolean;
  onMakeUp: (date: string, trigger: HTMLButtonElement) => void;
}) {
  const count = new Date(data.year, data.month, 0).getDate();
  const offset = (new Date(data.year, data.month - 1, 1).getDay() + 6) % 7;
  const days = new Map(data.days.map((day) => [day.day, day]));
  return (
    <div className={styles.calendar} aria-label="月度签到日历">
      {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
        <span className={styles.weekday} key={day}>
          {day}
        </span>
      ))}
      {Array.from({ length: offset }, (_, index) => (
        <span key={`blank-${index}`} />
      ))}
      {Array.from({ length: count }, (_, index) => {
        const day = days.get(index + 1);
        const canMakeUp = day && !day.signed && day.canMakeUp && data.remainMakeUpCount > 0;
        const label = `${data.month}月${index + 1}日${day?.isToday ? '，今天' : ''}，${day?.signed ? (day.signType === 2 ? '已补签' : '已签到') : canMakeUp ? '可补签' : '未签到'}${day ? `，${day.signed ? '' : '预计'}奖励 ${day.rewardPoints} 积分` : ''}`;
        const content = (
          <>
            <strong>{index + 1}</strong>
            <span>
              {day?.signed
                ? day.signType === 2
                  ? '补签'
                  : '已签'
                : canMakeUp
                  ? '补签'
                  : day
                    ? `+${day.rewardPoints}`
                    : '—'}
            </span>
          </>
        );
        const className = `${styles.day} ${day?.signed ? styles.signed : ''} ${day?.isToday ? styles.today : ''}`;
        return canMakeUp ? (
          <button
            type="button"
            className={className}
            aria-label={label}
            key={index + 1}
            disabled={disabled}
            onClick={(event) => onMakeUp(day.date, event.currentTarget)}
          >
            {content}
          </button>
        ) : (
          <div className={className} aria-label={label} key={index + 1}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
