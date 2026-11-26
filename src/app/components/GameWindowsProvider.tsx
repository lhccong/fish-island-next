import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { lazy, Suspense, useCallback, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { findTool, tools, type ToolPath } from '@/app/config/tools';
import { FloatingWindow } from '@/shared/ui/FloatingWindow';
import { WindowLauncher } from '@/shared/ui/WindowLauncher';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import { GameErrorBoundary } from './GameErrorBoundary';
import {
  GameWindowsContext,
  OpenedGameWindowsContext,
  gameTitles,
  type GameId,
} from './game-windows-context';
import { ToolSurface } from './ToolSurface';
import { ToolWindowPane } from './ToolWindowPane';
import { ToolWindowsContext, type ToolPlacement, type ToolSlots } from './tool-windows-context';
import styles from './GameWindows.module.css';

const GameWindowContent = lazy(() =>
  import('./GameWindowContent').then((m) => ({ default: m.GameWindowContent })),
);

type WindowId = GameId | ToolPath;

function isGame(id: WindowId): id is GameId {
  return Object.hasOwn(gameTitles, id);
}

function windowTitle(id: WindowId) {
  return isGame(id) ? gameTitles[id] : findTool(id)!.label;
}

export function GameWindowsProvider({
  children,
  pageTool,
}: {
  children: ReactNode;
  pageTool: ToolPath | undefined;
}) {
  const [opened, setOpened] = useState<WindowId[]>([]);
  const [active, setActive] = useState<WindowId | null>(null);
  const [slots, setSlots] = useState<ToolSlots>({});
  const returning = useRef<ToolPath | null>(null);
  const origins = useRef(new Map<WindowId, HTMLElement>());
  const returnFocus = useRef<HTMLElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const openedGames = opened.filter(isGame);
  const openedTools = opened.filter((id): id is ToolPath => !isGame(id));
  const activeTool = active && !isGame(active) ? findTool(active) : undefined;

  const registerSlot = useCallback(
    (path: ToolPath, placement: ToolPlacement, slot: HTMLDivElement | null) => {
      setSlots((current) => {
        const previous = current[path];
        if (previous?.[placement] === (slot ?? undefined)) return current;
        const next = { ...previous };
        if (slot) next[placement] = slot;
        else delete next[placement];
        return { ...current, [path]: next };
      });
      if (slot && placement === 'page' && returning.current === path) {
        returning.current = null;
        returnFocus.current = slot;
        origins.current.delete(path);
        setOpened((items) => items.filter((id) => id !== path));
        setActive((id) => (id === path ? null : id));
      }
    },
    [],
  );

  const open = (id: WindowId, origin = document.activeElement) => {
    returning.current = null;
    const focusOrigin =
      active && origin instanceof HTMLElement && origin.closest('[role="dialog"]')
        ? (origins.current.get(active) ?? origin)
        : origin;
    if (focusOrigin instanceof HTMLElement) {
      origins.current.set(id, focusOrigin);
      returnFocus.current = focusOrigin;
    }
    setOpened((items) => (items.includes(id) ? items : [...items, id]));
    setActive(id);
  };
  const close = () => {
    returning.current = null;
    if (active) origins.current.delete(active);
    setOpened((items) => items.filter((id) => id !== active));
    setActive(null);
  };
  const hide = () => {
    returning.current = null;
    setActive(null);
  };
  const returnToPage = (path: ToolPath) => {
    if (pageTool === path) close();
    else {
      returning.current = path;
      void navigate(path);
    }
  };

  function renderContinue(items: readonly WindowId[], label: string) {
    if (!items.length) return null;
    return (
      <nav aria-label={label} className={styles.dockGroup}>
        {items.map((id) => (
          <Button
            key={id}
            variant="secondary"
            onClick={(event) => {
              const origin = origins.current.get(id);
              open(id, origin?.isConnected ? origin : event.currentTarget);
            }}
          >
            继续{windowTitle(id)}
          </Button>
        ))}
      </nav>
    );
  }
  return (
    <GameWindowsContext value={open}>
      <ToolWindowsContext value={{ openTool: open, openedTools, registerSlot }}>
        <OpenedGameWindowsContext value={openedGames}>{children}</OpenedGameWindowsContext>
        {tools.map((tool) => {
          const windowed = openedTools.includes(tool.path);
          return windowed || pageTool === tool.path ? (
            <ToolSurface
              key={tool.path}
              tool={tool}
              slot={slots[tool.path]?.[windowed ? 'window' : 'page']}
            />
          ) : null;
        })}
        {opened.length > 0 && (
          <FloatingWindow
            returnFocusRef={returnFocus}
            title={windowTitle(active ?? opened[0]!)}
            actionName={activeTool ? '工具' : '游戏'}
            headerAction={
              activeTool && (
                <WindowLauncher
                  label={`返回${activeTool.label}整页`}
                  onClick={() => returnToPage(activeTool.path)}
                />
              )
            }
            hidden={active === null || location.pathname === '/user/login'}
            onHide={hide}
            onClose={close}
          >
            {opened.map((id) =>
              isGame(id) ? (
                <div key={id} hidden={id !== active} className={styles.pane}>
                  <ScrollArea
                    label={`${gameTitles[id]}内容`}
                    gutter="reserved"
                    fillContent={id === 'dark-room'}
                  >
                    <div className={styles.content} data-fill={id === 'dark-room'}>
                      <GameErrorBoundary>
                        <Suspense fallback={<LoadingIndicator>正在打开游戏…</LoadingIndicator>}>
                          <GameWindowContent
                            game={id}
                            onEscape={() =>
                              setActive((current) => (current === id ? null : current))
                            }
                          />
                        </Suspense>
                      </GameErrorBoundary>
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <ToolWindowPane key={id} tool={findTool(id)!} hidden={id !== active} />
              ),
            )}
          </FloatingWindow>
        )}
        {opened.length > 0 && location.pathname !== '/user/login' && (
          <div className={styles.dock} hidden={active !== null}>
            {renderContinue(openedGames, '已打开的游戏')}
            {renderContinue(openedTools, '已打开的工具')}
          </div>
        )}
      </ToolWindowsContext>
    </GameWindowsContext>
  );
}
