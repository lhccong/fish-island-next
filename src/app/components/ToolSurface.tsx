import { Suspense, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Tool } from '@/app/config/tools';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { GameErrorBoundary } from './GameErrorBoundary';
import styles from './GameWindows.module.css';

export function ToolSurface({ tool, slot }: { tool: Tool; slot: HTMLDivElement | undefined }) {
  // Keep the portal target stable when the tool moves between the page and the window.
  const [container] = useState(() => document.createElement('div'));
  useLayoutEffect(() => {
    if (slot && container.parentNode !== slot) slot.appendChild(container);
  }, [container, slot]);
  useLayoutEffect(() => () => container.remove(), [container]);

  const { Panel } = tool;
  return createPortal(
    <div className={styles.toolSurface}>
      <GameErrorBoundary
        fallback={
          <div className={styles.toolLoading} role="alert">
            <p>工具暂时无法打开</p>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              重新加载
            </Button>
          </div>
        }
      >
        <Suspense
          fallback={
            <div className={styles.toolLoading}>
              <LoadingIndicator>正在打开工具…</LoadingIndicator>
            </div>
          }
        >
          <Panel />
        </Suspense>
      </GameErrorBoundary>
    </div>,
    container,
  );
}
