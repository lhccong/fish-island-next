import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { FishCirclePort } from '@/domain/fish-circle';
import { NotificationContext } from './notification-context';

export function NotificationProvider({
  service,
  children,
  accountId,
}: {
  service: FishCirclePort;
  children: ReactNode;
  accountId: string;
}) {
  const [snapshot, setSnapshot] = useState<{
    accountId: string;
    count: number | null;
    error: string;
  }>({ accountId: '', count: null, error: '' });
  const current = snapshot.accountId === accountId ? snapshot : { count: null, error: '' };
  const reload = useRef<() => void>(() => {});
  const refresh = useCallback(() => reload.current(), []);
  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController();
    let pending = false;
    let again = false;
    async function load() {
      if (pending) {
        again = true;
        return;
      }
      pending = true;
      try {
        const value = await service.unreadReminderCount(controller.signal);
        if (!controller.signal.aborted) {
          setSnapshot({ accountId, count: value, error: '' });
        }
      } catch (e) {
        if (!controller.signal.aborted)
          setSnapshot((previous) => ({
            accountId,
            count: previous.accountId === accountId ? previous.count : null,
            error: e instanceof Error ? e.message : '未读数加载失败',
          }));
      } finally {
        pending = false;
        if (again && !controller.signal.aborted) {
          again = false;
          void load();
        }
      }
    }
    const visible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    reload.current = () => {
      void load();
    };
    void load();
    const timer = window.setInterval(visible, 60000);
    document.addEventListener('visibilitychange', visible);
    return () => {
      controller.abort();
      reload.current = () => {};
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [service, accountId]);
  return (
    <NotificationContext.Provider value={{ count: current.count, error: current.error, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}
