import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { BroadcastPort } from '@/domain/broadcast';
import { createBroadcastQueue } from './queue';
import { BroadcastRibbon } from './BroadcastRibbon';

export function GlobalBroadcast({ port }: { port: BroadcastPort }) {
  const [queue] = useState(createBroadcastQueue);
  const events = useSyncExternalStore(queue.subscribe, queue.getSnapshot);
  useEffect(() => port.subscribe(queue.enqueue), [port, queue]);
  const current = events[0];
  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => queue.dismiss(current.id), 3000);
    return () => clearTimeout(timer);
  }, [current, queue]);
  return current
    ? createPortal(
        <BroadcastRibbon
          key={current.id}
          event={current}
          onDismiss={() => queue.dismiss(current.id)}
        />,
        document.body,
      )
    : null;
}
