import { useState, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { shiftTodoMonth, todayTodoDate, todoMonthDays } from '@/domain/todo';
import { Button } from '@/shared/ui/Button';
import styles from './TodoCalendar.module.css';

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

export function TodoCalendar({
  selected,
  counts,
  overview = false,
  onSelect,
}: {
  selected: string;
  counts?: ReadonlyMap<string, number>;
  overview?: boolean;
  onSelect: (date: string) => void;
}) {
  const [month, setMonth] = useState(() => shiftTodoMonth(selected, 0));
  const [focusedDay, setFocusedDay] = useState(selected);
  const monthLabel = `${month.slice(0, 4)} 年 ${Number(month.slice(5, 7))} 月`;
  const days = todoMonthDays(month);
  const today = todayTodoDate();

  function moveDayFocus(event: KeyboardEvent<HTMLDivElement>) {
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const offset = offsets[event.key];
    if (offset === undefined) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
    const index = buttons.findIndex((button) => button === event.target);
    if (index < 0) return;
    event.preventDefault();
    buttons[Math.max(0, Math.min(buttons.length - 1, index + offset))]?.focus();
  }

  return (
    <div className={styles.calendar} data-overview={overview || undefined}>
      <div className={styles.heading}>
        <Button
          variant="secondary"
          className={styles.monthButton}
          aria-label="上个月"
          disabled={month.startsWith('0000-01')}
          onClick={() => setMonth(shiftTodoMonth(month, -1))}
        >
          <ChevronLeft size={17} aria-hidden="true" />
        </Button>
        <span aria-live="polite">{monthLabel}</span>
        <Button
          variant="secondary"
          className={styles.monthButton}
          aria-label="下个月"
          disabled={month.startsWith('9999-12')}
          onClick={() => setMonth(shiftTodoMonth(month, 1))}
        >
          <ChevronRight size={17} aria-hidden="true" />
        </Button>
      </div>
      <div className={styles.days} role="group" aria-label={monthLabel} onKeyDown={moveDayFocus}>
        {weekdays.map((day) => (
          <span key={day} className={styles.weekday} aria-label={`星期${day}`}>
            {day}
          </span>
        ))}
        {days.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} aria-hidden="true" />;
          const count = counts?.get(day) ?? 0;
          return (
            <button
              key={day}
              className={styles.day}
              type="button"
              aria-label={count ? `${day}，${count} 项任务` : day}
              aria-current={day === today ? 'date' : undefined}
              aria-pressed={day === selected}
              tabIndex={
                day === (focusedDay.startsWith(month.slice(0, 7)) ? focusedDay : month) ? 0 : -1
              }
              onFocus={() => setFocusedDay(day)}
              onClick={() => onSelect(day)}
            >
              {Number(day.slice(8))}
              {count > 0 &&
                (overview ? (
                  <span className={styles.count} aria-hidden="true">
                    {count > 99 ? '99+' : count}
                  </span>
                ) : (
                  <span className={styles.dot} aria-hidden="true" />
                ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
