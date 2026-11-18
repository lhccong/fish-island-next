import { useRef, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HolidayCountdown } from '@/domain/account-tools';
import { HoverPreview } from '@/shared/ui/HoverPreview';
import styles from './WorkTime.module.css';
import { WorkTimePixelIcon, type WorkTimePhase } from './WorkTimePixelIcon';
import { useWorkTimeOrb } from './use-work-time-orb';
import { HolidaySummary } from './HolidaySummary';

interface WorkTimeOrbProps {
  holiday: HolidayCountdown | null;
  label: string;
  time: string;
  progress: number;
  phase: WorkTimePhase;
  suspended: boolean;
  onOpen: () => void;
}

export function WorkTimeOrb({
  holiday,
  label,
  time,
  progress,
  phase,
  suspended,
  onOpen,
}: WorkTimeOrbProps) {
  const button = useRef<HTMLButtonElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { area, position, collapsed, side, dragging, activate, ...events } = useWorkTimeOrb(
    suspended || previewOpen,
  );
  return (
    <div ref={area} className={styles.orbit}>
      <HoverPreview
        label="节假日倒计时"
        content={<HolidaySummary holiday={holiday} />}
        anchorRef={button}
        onOpenChange={setPreviewOpen}
        size="compact"
        disabled={suspended || dragging || collapsed}
      >
        {(descriptionId) => (
          <button
            ref={button}
            {...events}
            type="button"
            className={styles.orb}
            style={{ '--orb-x': position.x, '--orb-y': position.y } as CSSProperties}
            data-collapsed={collapsed}
            data-side={side}
            data-dragging={dragging}
            aria-label="工作时间设置"
            aria-expanded={!collapsed}
            aria-describedby={descriptionId}
            aria-description={
              collapsed
                ? '点击展开工作时间，也可直接拖动'
                : `${label} ${time}；拖动调整位置，Home/End 贴边，Esc 收起`
            }
            onClick={(event) => activate(event.detail, onOpen)}
          >
            <svg className={styles.frame} viewBox="0 0 80 80" aria-hidden="true">
              <circle cx="40" cy="40" r="38" />
            </svg>
            <span className={styles.pixelIcon}>
              <WorkTimePixelIcon phase={phase} />
            </span>
            <span className={styles.orbLabel}>{label}</span>
            <span className={styles.orbTime}>{time}</span>
            <span className={styles.meter} aria-hidden="true">
              {[0, 1, 2, 3, 4].map((step) => (
                <span key={step} data-filled={progress >= (step + 1) / 5} />
              ))}
            </span>
            <span className={styles.peek} aria-hidden="true">
              {side === 'left' ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </span>
          </button>
        )}
      </HoverPreview>
    </div>
  );
}
