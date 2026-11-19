import { useEffect, useState } from 'react';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import type { BigFishEvent } from '@/domain/chat';
import { useChatRealtime } from './realtime-context';

type ReplyStatus = Exclude<BigFishEvent, { status: 'speech' }>;

export function BigFishReplyStatus() {
  const { controller } = useChatRealtime();
  const [status, setStatus] = useState<ReplyStatus | null>(null);

  useEffect(
    () =>
      controller.subscribeBigFish((event) => {
        if (event.status === 'speech') {
          setStatus((current) => (current?.id === event.id ? null : current));
          return;
        }
        setStatus(event);
      }),
    [controller],
  );

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(
      () => {
        setStatus((current) => {
          if (current !== status) return current;
          return status.status === 'thinking'
            ? { ...status, status: 'error', text: '等大肥鱼回复超时了，请稍后再试。' }
            : null;
        });
      },
      status.status === 'thinking' ? 35000 : 8000,
    );
    return () => window.clearTimeout(timer);
  }, [status]);

  if (!status) return null;
  return status.status === 'thinking' ? (
    <LoadingIndicator compact>大肥鱼在想…</LoadingIndicator>
  ) : (
    <span role="status" data-tone="error">
      {status.text}
    </span>
  );
}
