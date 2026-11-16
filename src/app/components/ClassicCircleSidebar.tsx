import { lazy, Suspense } from 'react';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import styles from './ClassicCircleSidebar.module.css';
const Circle = lazy(() =>
  import('@/features/fish-circle').then((module) => ({ default: module.IslandCircleFeed })),
);
export function ClassicCircleSidebar() {
  return (
    <div className={styles.sidebar} id="classic-circle-sidebar">
      <Suspense fallback={<LoadingIndicator>正在打开鱼小圈…</LoadingIndicator>}>
        <Circle active presentation="classic" />
      </Suspense>
    </div>
  );
}
