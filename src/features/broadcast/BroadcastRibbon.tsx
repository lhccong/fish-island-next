import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Megaphone, X } from 'lucide-react';
import type { Broadcast } from '@/domain/broadcast';
import { Button } from '@/shared/ui/Button';
import styles from './Broadcast.module.css';

export function BroadcastRibbon({ event, onDismiss }: { event: Broadcast; onDismiss: () => void }) {
  const lane = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const measure = () => setWidth(lane.current?.clientWidth ?? 0);
    const observer = new ResizeObserver(measure);
    if (lane.current) observer.observe(lane.current);
    measure();
    return () => observer.disconnect();
  }, []);
  const style = {
    '--broadcast-start': `${width}px`,
  } as CSSProperties;
  return (
    <aside className={styles.position} aria-label="全体播报">
      <div className={styles.ribbon} style={style}>
        <Megaphone size={18} aria-hidden="true" className={styles.icon} />
        <div className={styles.lane} ref={lane}>
          <span className={styles.text} aria-hidden="true">
            {event.content}
          </span>
        </div>
        <span className={styles.accessible} role="status">
          全体播报：{event.content}
        </span>
        <Button
          variant="secondary"
          className={styles.close}
          aria-label="关闭播报"
          onClick={onDismiss}
        >
          <X size={14} aria-hidden="true" />
        </Button>
      </div>
    </aside>
  );
}
