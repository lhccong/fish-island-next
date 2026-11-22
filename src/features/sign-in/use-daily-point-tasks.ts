import { useEffect, useState } from 'react';
import type { DailyPointTasks, SignInPort } from '@/domain/sign-in';

type State =
  | { status: 'loading' }
  | { status: 'ready'; data: DailyPointTasks }
  | { status: 'error'; message: string };

export function useDailyPointTasks(port: SignInPort) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ revision: number; state: State } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    let timer: number | undefined;
    const report = (state: State) => setResult({ revision, state });
    async function load() {
      if (loading || controller.signal.aborted) return;
      loading = true;
      window.clearTimeout(timer);
      report({ status: 'loading' });
      try {
        const data = await port.tasks(controller.signal);
        if (controller.signal.aborted) return;
        report({ status: 'ready', data });
        timer = window.setTimeout(() => void load(), data.refreshAt - data.serverNow);
      } catch (error) {
        if (!controller.signal.aborted)
          report({ status: 'error', message: error instanceof Error ? error.message : '读取失败' });
      } finally {
        loading = false;
      }
    }
    const synchronize = () => {
      if (!document.hidden) void load();
    };
    void Promise.resolve().then(load);
    document.addEventListener('visibilitychange', synchronize);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', synchronize);
    };
  }, [port, revision]);

  const state: State = result?.revision === revision ? result.state : { status: 'loading' };
  return { state, refresh: () => setRevision((value) => value + 1) };
}
