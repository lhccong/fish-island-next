import type { AdminFilter } from '@/domain/admin';
import styles from './Admin.module.css';
export function UserDateFilters({
  value,
  onChange,
}: {
  value: AdminFilter;
  onChange: (v: AdminFilter) => void;
}) {
  function update(key: string, dates: string[]) {
    const n = { ...value };
    if (dates.every((d) => !d)) delete n[key];
    else n[key] = dates;
    onChange(n);
  }
  return (
    <>
      {(
        [
          ['createTimeRange', '注册'],
          ['updateTimeRange', '更新'],
        ] as const
      ).map(([key, label]) => {
        const raw = value[key];
        const dates = Array.isArray(raw) ? raw : ['', ''];
        return (
          <div className={styles.field} role="group" aria-label={`${label}时间`} key={key}>
            <span>{label}时间</span>
            <div className={styles.dateRange}>
              <input
                aria-label={`${label}开始日期`}
                type="date"
                value={dates[0] ?? ''}
                max={dates[1] || undefined}
                onChange={(e) => update(key, [e.target.value, dates[1] ?? ''])}
              />
              <span aria-hidden="true">—</span>
              <input
                aria-label={`${label}结束日期`}
                type="date"
                value={dates[1] ?? ''}
                min={dates[0] || undefined}
                onChange={(e) => update(key, [dates[0] ?? '', e.target.value])}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}
