import { useEffect, useState } from 'react';
import { Dialog } from '@/shared/ui/Dialog';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import styles from './Tools.module.css';
import {
  getHolidayCountdown,
  isWorkDay,
  timeMinute as minute,
  validSchedule,
} from '@/domain/account-tools';
import { Select } from '@/shared/ui/Select';
import { readSchedule, scheduleKey } from './work-schedule';
import { WorkTimeOrb } from './WorkTimeOrb';
import workStyles from './WorkTime.module.css';
import { HolidaySummary } from './HolidaySummary';
export function WorkTime({ visible }: { visible: boolean }) {
  const [saved, setSaved] = useState(readSchedule);
  const [draft, setDraft] = useState(saved);
  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [visible]);
  const current = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const start = minute(saved.start),
    end = minute(saved.end),
    lunch = minute(saved.lunch);
  const target = current < start ? start : current < lunch ? lunch : end;
  const remaining = Math.max(0, Math.round((target - current) * 60));
  const countdown = `${Math.floor(remaining / 3600)}时${Math.floor((remaining % 3600) / 60)}分${remaining % 60}秒`;
  const label = current < start ? '上班' : current < lunch ? '午饭' : '下班';
  const working = isWorkDay(now, saved);
  const holiday = getHolidayCountdown(now);
  const progress = working ? Math.min(1, Math.max(0, (current - start) / (end - start))) : 0;
  const status = !working ? '今天休息' : remaining ? `距${label}` : '已下班';
  const clock = remaining
    ? [Math.floor(remaining / 3600), Math.floor((remaining % 3600) / 60), remaining % 60]
        .map((value) => String(value).padStart(2, '0'))
        .join(':')
    : '辛苦了';
  if (!visible) return null;
  return (
    <>
      <WorkTimeOrb
        holiday={holiday}
        label={status}
        time={!working ? '好好放松' : clock}
        progress={progress}
        suspended={open}
        phase={
          !working
            ? 'rest'
            : !remaining
              ? 'done'
              : current < start
                ? 'start'
                : current < lunch
                  ? 'lunch'
                  : 'end'
        }
        onOpen={() => {
          setDraft(saved);
          setNotice('');
          setError('');
          setOpen(true);
        }}
      />
      <Dialog
        title="工作时间"
        description="仅在此浏览器计算时间和收入估算，不代表考勤。按当日时间计算，暂不支持跨夜班次。"
        className={`${styles.dialog} ${styles.work}`}
        open={open}
        onOpenChange={setOpen}
        dismissLabel="关闭工作时间"
        showCloseAction={false}
      >
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            setError('');
            setNotice('');
            try {
              if (!validSchedule(draft))
                throw new Error('请检查时间顺序、月薪和每月工作天数（1～31）');
              const next = {
                ...draft,
                anchor: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
              };
              localStorage.setItem(scheduleKey, JSON.stringify(next));
              setSaved(next);
              setNotice('已保存到此浏览器');
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : '保存失败，请重试');
            }
          }}
        >
          <ScrollArea label="工作时间内容" gutter="reserved" className={styles.scroll ?? ''}>
            <div className={`${styles.fields} ${styles.formGrid}`}>
              <section className={workStyles.overview} aria-label="今日工作概览">
                <div className={workStyles.summary}>
                  <span>{status}</span>
                  <strong>{!working ? '好好放松' : remaining ? countdown : '辛苦了'}</strong>
                </div>
                <div className={workStyles.timeline}>
                  <span>
                    上班<b>{saved.start}</b>
                  </span>
                  <span>
                    午饭<b>{saved.lunch}</b>
                  </span>
                  <span>
                    下班<b>{saved.end}</b>
                  </span>
                </div>
                {saved.salary > 0 && (
                  <p className={workStyles.income}>
                    今日收入估算 ¥{((progress * saved.salary) / saved.days).toFixed(2)}
                  </p>
                )}
              </section>
              <div className={workStyles.holiday}>
                <HolidaySummary holiday={holiday} />
              </div>
              <div className={styles.timeFields}>
                {(
                  [
                    ['start', '上班时间'],
                    ['lunch', '午饭时间'],
                    ['end', '下班时间'],
                  ] as const
                ).map(([field, title]) => (
                  <label className={styles.field} key={field}>
                    {title}
                    <input
                      required
                      type="text"
                      inputMode="numeric"
                      pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                      placeholder="HH:mm"
                      value={draft[field]}
                      onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}
                    />
                  </label>
                ))}
              </div>
              <label className={styles.field}>
                月薪（元，可不填）
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.salary}
                  onChange={(e) => setDraft({ ...draft, salary: Number(e.target.value) })}
                />
              </label>
              <label className={styles.field}>
                每月工作天数
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={draft.days}
                  onChange={(e) => setDraft({ ...draft, days: Number(e.target.value) })}
                />
              </label>
              <div className={styles.field}>
                <span>工作制</span>
                <Select
                  label="工作制"
                  value={draft.workdayType}
                  options={[
                    { value: 'single', label: '单休' },
                    { value: 'double', label: '双休' },
                    { value: 'mixed', label: '大小周' },
                  ]}
                  onValueChange={(value) =>
                    setDraft({ ...draft, workdayType: value as typeof draft.workdayType })
                  }
                />
              </div>
              {draft.workdayType === 'mixed' && (
                <div className={styles.field}>
                  <span>本周类型</span>
                  <Select
                    label="本周类型"
                    value={draft.bigWeek ? 'big' : 'small'}
                    options={[
                      { value: 'big', label: '大周（周六上班）' },
                      { value: 'small', label: '小周（周六休息）' },
                    ]}
                    onValueChange={(value) => setDraft({ ...draft, bigWeek: value === 'big' })}
                  />
                </div>
              )}
              <p className={`${styles.hint} ${styles.span}`}>
                按所选工作制计算，不包含法定节假日调休。
              </p>
            </div>
          </ScrollArea>
          <div className={styles.feedback}>
            {error && <p role="alert">{error}</p>}
            {notice && <p role="status">{notice}</p>}
          </div>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="submit">保存</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
