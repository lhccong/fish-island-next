import { lazy, Suspense, type Ref } from 'react';
import { PanelLeftClose, PanelRightClose } from 'lucide-react';
import { useChatPanelStore } from '@/features/appearance';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import styles from './ClassicCircleSidebar.module.css';
import { CirclePositionPicker } from './CirclePositionPicker';
const Circle = lazy(() =>
  import('@/features/fish-circle').then((module) => ({ default: module.IslandCircleFeed })),
);
export function ClassicCircleSidebar({
  onCollapse,
  collapseRef,
}: {
  onCollapse: () => void;
  collapseRef: Ref<HTMLButtonElement>;
}) {
  const position = useChatPanelStore((state) => state.circlePosition);
  return (
    <div className={styles.sidebar} id="classic-circle-sidebar">
      <Suspense fallback={<LoadingIndicator>正在打开鱼小圈…</LoadingIndicator>}>
        <Circle
          active
          presentation="classic"
          headingAction={
            <>
              <Button
                ref={collapseRef}
                variant="secondary"
                className={styles.collapse}
                aria-label="收起鱼小圈"
                title="收起鱼小圈"
                aria-expanded
                aria-controls="classic-circle-sidebar"
                onClick={onCollapse}
              >
                {position === 'right' ? (
                  <PanelRightClose size={16} aria-hidden="true" />
                ) : (
                  <PanelLeftClose size={16} aria-hidden="true" />
                )}
              </Button>
              <CirclePositionPicker />
            </>
          }
        />
      </Suspense>
    </div>
  );
}
