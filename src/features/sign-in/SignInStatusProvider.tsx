import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { SignInPort } from '@/domain/sign-in';
import { SignInStatusContext, type SignInView } from './sign-in-status-context';

const dayKey = () => new Date().toDateString();

export function SignInStatusProvider({
  port,
  accountId,
  children,
}: {
  port: SignInPort;
  accountId: string;
  children: ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<{
    accountId: string;
    day: string;
    signed: boolean | null;
  } | null>(null);
  const request = useRef<AbortController | null>(null);
  const [selection, setSelection] = useState<{ accountId: string; view: SignInView } | null>(null);
  const report = useCallback(
    (signed: boolean) => {
      request.current?.abort();
      setSnapshot({ accountId, day: dayKey(), signed });
    },
    [accountId],
  );

  useEffect(() => {
    if (!accountId) return;
    async function load() {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      const requestedDay = dayKey();
      try {
        const signed = await port.status(controller.signal);
        if (!controller.signal.aborted && requestedDay === dayKey())
          setSnapshot({ accountId, day: requestedDay, signed });
      } catch {
        if (!controller.signal.aborted) setSnapshot({ accountId, day: requestedDay, signed: null });
      }
    }
    const visible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    let timer: number;
    function scheduleMidnight() {
      const nextDay = new Date();
      nextDay.setHours(24, 0, 0, 0);
      timer = window.setTimeout(() => {
        void load();
        scheduleMidnight();
      }, nextDay.getTime() - Date.now());
    }
    scheduleMidnight();
    void load();
    document.addEventListener('visibilitychange', visible);
    return () => {
      request.current?.abort();
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [accountId, port]);

  const todaySigned =
    snapshot?.accountId === accountId && snapshot.day === dayKey() ? snapshot.signed : null;
  return (
    <SignInStatusContext.Provider
      value={{
        todaySigned,
        report,
        view: selection?.accountId === accountId ? selection.view : 'calendar',
        selectView: (view) => setSelection({ accountId, view }),
      }}
    >
      {children}
    </SignInStatusContext.Provider>
  );
}
