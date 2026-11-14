import { useEffect, useRef, useState } from 'react';
import type { SignInPort, SignMonth } from '@/domain/sign-in';

type CalendarState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: SignMonth; todaySigned: boolean };

export function useSignIn(port: SignInPort, year: number, month: number) {
  const [loaded, setLoaded] = useState<{ key: string; value: CalendarState } | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const key = `${year}-${month}-${revision}`;
  const state: CalendarState = loaded?.key === key ? loaded.value : { status: 'loading' };
  const scope = useRef<AbortController | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    scope.current = controller;
    void Promise.all([port.month(year, month, controller.signal), port.status(controller.signal)])
      .then(([data, todaySigned]) => {
        if (!controller.signal.aborted)
          setLoaded({ key, value: { status: 'ready', data, todaySigned } });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setLoaded({
            key,
            value: {
              status: 'error',
              message: error instanceof Error ? error.message : '读取签到失败',
            },
          });
      });
    return () => controller.abort();
  }, [port, year, month, key]);

  async function submit(date?: string) {
    const controller = scope.current;
    if (lock.current || !controller || controller.signal.aborted || state.status !== 'ready')
      return;
    if (!date && state.todaySigned) return;
    lock.current = true;
    setPending(true);
    setError('');
    setNotice('');
    try {
      const result = await (date
        ? port.makeUp(date, controller.signal)
        : port.sign(controller.signal));
      if (controller.signal.aborted) return;
      setNotice(
        `${date ? `${date} 补签` : '签到'}成功，获得 ${result.totalPoints} 积分${result.bonusPoints ? `（含连续奖励 ${result.bonusPoints}）` : ''}。${date ? '已消耗 20 积分。' : ''}${result.nextDayBonus ? `下次连续签到额外奖励 ${result.nextDayBonus} 积分。` : ''}`,
      );
      setRevision((value) => value + 1);
      return true;
    } catch (error) {
      if (!controller.signal.aborted)
        setError(error instanceof Error ? error.message : '操作失败，请重试');
    } finally {
      lock.current = false;
      if (!controller.signal.aborted) setPending(false);
    }
  }
  return { state, pending, notice, error, submit, retry: () => setRevision((value) => value + 1) };
}
