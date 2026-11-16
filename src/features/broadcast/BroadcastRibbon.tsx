import { Megaphone, X } from 'lucide-react';
import type { Broadcast } from '@/domain/broadcast';
import { Button } from '@/shared/ui/Button';
import { useBroadcastPlayback } from './use-broadcast-playback';
import styles from './Broadcast.module.css';

export function BroadcastRibbon({ event, onDismiss }: { event: Broadcast; onDismiss: () => void }) {
  const { laneRef, textRef, timing } = useBroadcastPlayback(event.content, onDismiss);
  return (
    <aside className={styles.position} aria-label="全体播报">
      <div
        className={styles.ribbon}
        data-duration-ms={timing?.duration}
        data-distance={timing?.distance}
      >
        <Megaphone size={16} aria-hidden="true" className={styles.icon} />
        <div className={styles.lane} ref={laneRef}>
          <span className={styles.text} ref={textRef} aria-hidden="true" data-broadcast-content>
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
