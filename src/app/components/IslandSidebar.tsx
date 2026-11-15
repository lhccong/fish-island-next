import { lazy, Suspense, useId } from 'react';
import { Settings } from 'lucide-react';
import { PixelIcon } from '@/shared/ui/PixelIcon';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { MyIslandPanel } from '@/features/my-island';
import { useIslandSidebar } from './island-sidebar-context';
import styles from './IslandSidebar.module.css';
const Circle = lazy(() =>
  import('@/features/fish-circle').then((module) => ({ default: module.IslandCircleFeed })),
);

export function IslandSidebar({ active = true }: { active?: boolean }) {
  const { tab, setTab, editing, setEditing, visited } = useIslandSidebar();
  const id = useId();
  return (
    <section className={styles.panel} aria-label="我的海岛">
      <header className={styles.header}>
        <PixelIcon name="palm" />
        <h2>我的海岛</h2>
        <button
          type="button"
          aria-label="海岛设置"
          aria-pressed={editing}
          onClick={() => {
            setTab('notebook');
            setEditing(!editing);
          }}
        >
          <Settings size={17} aria-hidden="true" />
        </button>
      </header>
      <div
        className={styles.tabs}
        role="tablist"
        aria-label="海岛内容"
        onKeyDown={(event) => {
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const next =
              event.key === 'Home'
                ? 'circle'
                : event.key === 'End'
                  ? 'notebook'
                  : tab === 'circle'
                    ? 'notebook'
                    : 'circle';
            setTab(next);
            event.currentTarget.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)?.focus();
          }
        }}
      >
        {(['circle', 'notebook'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`${id}-tab-${value}`}
            aria-controls={`${id}-panel-${value}`}
            data-tab={value}
            aria-selected={tab === value}
            tabIndex={tab === value ? 0 : -1}
            onClick={() => setTab(value)}
          >
            {value === 'notebook' ? '手账' : '鱼小圈'}
          </button>
        ))}
      </div>
      <div
        className={styles.notebook}
        hidden={tab !== 'notebook'}
        role="tabpanel"
        aria-label="手账"
        id={`${id}-panel-notebook`}
        aria-labelledby={`${id}-tab-notebook`}
      >
        <MyIslandPanel presentation="embedded" editing={editing} onEditingChange={setEditing} />
      </div>
      <div
        className={styles.circle}
        hidden={tab !== 'circle'}
        role="tabpanel"
        aria-label="鱼小圈"
        id={`${id}-panel-circle`}
        aria-labelledby={`${id}-tab-circle`}
      >
        <div className={styles.coast} aria-hidden="true" />
        <div className={styles.feed}>
          {visited && (
            <Suspense fallback={<LoadingIndicator>正在打开鱼小圈…</LoadingIndicator>}>
              <Circle active={tab === 'circle' && active} />
            </Suspense>
          )}
        </div>
      </div>
    </section>
  );
}
