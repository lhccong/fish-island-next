import type { HolidayCountdown } from '@/domain/account-tools';
import styles from './HolidaySummary.module.css';

export function HolidaySummary({ holiday }: { holiday: HolidayCountdown | null }) {
  return (
    <section className={styles.summary} aria-label="节假日倒计时">
      {holiday ? (
        <>
          <strong className={styles.name}>{holiday.name}</strong>
          <span className={styles.dates}>{holiday.dates}</span>
          <strong className={styles.remaining}>{holiday.remaining}</strong>
        </>
      ) : (
        <p className={styles.empty}>2027 年假期已结束，等待更新放假安排</p>
      )}
    </section>
  );
}
