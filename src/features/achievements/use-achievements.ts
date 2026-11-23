import { useEffect, useRef, useState } from 'react';
import type { AchievementPort, AchievementSummary } from '@/domain/achievements';

type Catalog =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; summary: AchievementSummary };

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useAchievements(
  service: AchievementPort,
  refreshUser: (signal: AbortSignal) => Promise<void>,
) {
  const [catalog, setCatalog] = useState<Catalog>({ status: 'loading' });
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const operation = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void service.list(controller.signal).then(
      (summary) => {
        if (!controller.signal.aborted) setCatalog({ status: 'ready', summary });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setCatalog({ status: 'error', message: message(error, '读取成就失败，请重试') });
      },
    );
    return () => controller.abort();
  }, [service, revision]);

  useEffect(() => () => operation.current?.abort(), []);

  function retry() {
    setCatalog({ status: 'loading' });
    setRevision((value) => value + 1);
  }

  async function claim() {
    if (operation.current) return;
    const controller = new AbortController();
    const { signal } = controller;
    operation.current = controller;
    setPending(true);
    setFeedback(null);
    try {
      const summary = await service.claim(signal);
      if (signal.aborted) return;
      setCatalog({ status: 'ready', summary });
      const received = summary.awardedPoints
        ? `已领取 ${summary.awardedPoints.toLocaleString('zh-CN')} 积分`
        : '当前没有可领取的奖励';
      setFeedback({ error: false, text: received });
      try {
        await refreshUser(signal);
      } catch {
        if (!signal.aborted && summary.awardedPoints)
          setFeedback({ error: false, text: received + '，积分余额稍后同步' });
      }
    } catch (error) {
      if (!signal.aborted) setFeedback({ error: true, text: message(error, '领取失败，请重试') });
    } finally {
      operation.current = null;
      if (!signal.aborted) setPending(false);
    }
  }

  return { catalog, pending, feedback, retry, claim };
}
