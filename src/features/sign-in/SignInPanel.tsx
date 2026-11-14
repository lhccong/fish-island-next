import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { shiftMonth, type SignInPort } from '@/domain/sign-in';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { SignCalendar } from './SignCalendar';
import { useSignIn } from './use-sign-in';
import { MakeUpConfirmation } from './MakeUpConfirmation';
import styles from './SignIn.module.css';

export function SignInPanel({ port }: { port: SignInPort }) {
  const today = new Date();
  const [view, setView] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  }));
  const [makeUpDate, setMakeUpDate] = useState<string | null>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const monthFocus = useRef<HTMLButtonElement | null>(null);
  const { state, pending, notice, error, submit, retry } = useSignIn(port, view.year, view.month);
  const current = view.year === today.getFullYear() && view.month === today.getMonth() + 1;
  function move(delta: number) {
    setMakeUpDate(null);
    setView(shiftMonth(view.year, view.month, delta));
  }
  return (
    <>
      <ScrollArea className={`${styles.scroll}`} gutter="reserved" label="签到详情">
        <div className={styles.body}>
          <div className={styles.month}>
            <Button
              variant="secondary"
              aria-label="上个月"
              ref={monthFocus}
              disabled={pending || (view.year <= 1900 && view.month === 1)}
              onClick={() => move(-1)}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </Button>
            <h3>
              {view.year}年 {view.month}月
            </h3>
            <Button
              variant="secondary"
              aria-label="下个月"
              disabled={pending || current}
              onClick={() => move(1)}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
          </div>
          {!current && (
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setMakeUpDate(null);
                setView({ year: today.getFullYear(), month: today.getMonth() + 1 });
              }}
            >
              回到本月
            </Button>
          )}
          {state.status === 'loading' && <p role="status">正在读取签到记录…</p>}
          {state.status === 'error' && (
            <div role="alert">
              <p>{state.message}</p>
              <Button variant="secondary" onClick={retry}>
                重新读取
              </Button>
            </div>
          )}
          {state.status === 'ready' && (
            <>
              <dl className={styles.stats}>
                <div>
                  <dt>连续签到</dt>
                  <dd>
                    {state.data.continuousDays}
                    <small> 天</small>
                  </dd>
                </div>
                <div>
                  <dt>累计签到</dt>
                  <dd>
                    {state.data.totalSignInDays}
                    <small> 天</small>
                  </dd>
                </div>
                <div>
                  <dt>可用积分</dt>
                  <dd>{state.data.currentPoints}</dd>
                </div>
              </dl>
              {state.data.days.length ? (
                <SignCalendar
                  data={state.data}
                  disabled={pending}
                  onMakeUp={(date, trigger) => {
                    returnFocus.current = trigger;
                    setMakeUpDate(date);
                  }}
                />
              ) : (
                <div>
                  <p role="status">本月暂无签到日历，请稍后重新读取。</p>
                  <Button variant="secondary" onClick={retry}>
                    重新读取
                  </Button>
                </div>
              )}
              <p className={styles.hint}>
                本月剩余补签 {state.data.remainMakeUpCount} 次。仅可补签最近 7 天，每次消耗 20
                积分，每月最多 3 次。未签到日期的积分为预计奖励。
              </p>
            </>
          )}
        </div>
      </ScrollArea>
      <footer className={styles.footer}>
        {notice && <p role="status">{notice}</p>}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <Button
            disabled={pending || state.status !== 'ready' || state.todaySigned}
            onClick={() => {
              void submit();
            }}
          >
            {pending
              ? '处理中…'
              : state.status === 'ready' && state.todaySigned
                ? '今日已签到'
                : '立即签到'}
          </Button>
        </div>
      </footer>
      <MakeUpConfirmation
        date={makeUpDate}
        pending={pending}
        error={error}
        returnFocusRef={returnFocus}
        onClose={() => setMakeUpDate(null)}
        onConfirm={() => {
          if (makeUpDate)
            void submit(makeUpDate).then((success) => {
              if (success) {
                returnFocus.current = monthFocus.current;
                setMakeUpDate(null);
              }
            });
        }}
      />
    </>
  );
}
