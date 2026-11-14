import { lazy, Suspense, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { FloatingWindow } from '@/shared/ui/FloatingWindow';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import { GameErrorBoundary } from './GameErrorBoundary';
import { GameWindowsContext, gameTitles, type GameId } from './game-windows-context';
import styles from './GameWindows.module.css';

const GameWindowContent = lazy(() =>
  import('./GameWindowContent').then((m) => ({ default: m.GameWindowContent })),
);

export function GameWindowsProvider({ children }: { children: ReactNode }) {
  const [opened, setOpened] = useState<GameId[]>([]);
  const [active, setActive] = useState<GameId | null>(null);
  const origins = useRef(new Map<GameId, HTMLElement>());
  const returnFocus = useRef<HTMLElement | null>(null);
  const location = useLocation();
  const open = (id: GameId) => {
    if (document.activeElement instanceof HTMLElement) {
      origins.current.set(id, document.activeElement);
      returnFocus.current = document.activeElement;
    }
    setOpened((items) => (items.includes(id) ? items : [...items, id]));
    setActive(id);
  };
  const close = () => {
    setOpened((items) => items.filter((id) => id !== active));
    setActive(null);
  };
  return (
    <GameWindowsContext value={open}>
      {children}
      {opened.length > 0 && (
        <FloatingWindow
          returnFocusRef={returnFocus}
          title={gameTitles[active ?? opened[0]!]}
          hidden={active === null || location.pathname === '/user/login'}
          onHide={() => setActive(null)}
          onClose={close}
        >
          {opened.map((id) => (
            <div key={id} hidden={id !== active} className={styles.pane}>
              <ScrollArea label={`${gameTitles[id]}内容`} gutter="reserved">
                <div className={styles.content}>
                  <GameErrorBoundary>
                    <Suspense fallback={<p role="status">正在打开游戏…</p>}>
                      <GameWindowContent game={id} />
                    </Suspense>
                  </GameErrorBoundary>
                </div>
              </ScrollArea>
            </div>
          ))}
        </FloatingWindow>
      )}
      {opened.length > 0 && location.pathname !== '/user/login' && (
        <nav aria-label="已打开的游戏" className={styles.dock} hidden={active !== null}>
          {opened.map((id) => (
            <Button
              key={id}
              variant="secondary"
              onClick={() => {
                returnFocus.current = origins.current.get(id) ?? null;
                setActive(id);
              }}
            >
              继续{gameTitles[id]}
            </Button>
          ))}
        </nav>
      )}
    </GameWindowsContext>
  );
}
