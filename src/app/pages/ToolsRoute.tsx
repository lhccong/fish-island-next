import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { WorkspaceLayout } from '@/app/components/WorkspaceLayout';
import { useToolSlot, useToolWindows } from '@/app/components/tool-windows-context';
import { tools, type Tool } from '@/app/config/tools';
import { Button } from '@/shared/ui/Button';
import { WindowLauncher } from '@/shared/ui/WindowLauncher';
import styles from './ToolsRoute.module.css';

export function ToolsRoute({ tool }: { tool: Tool }) {
  const id = useId();
  const navigate = useNavigate();
  const [focusedPath, setFocusedPath] = useState<string | null>(null);
  const focused = focusedPath ?? tool.path;
  const isTodo = tool.path === '/utils/todo';
  const { openTool, openedTools } = useToolWindows();
  const register = useToolSlot(tool.path, 'page');
  const windowed = openedTools.includes(tool.path);
  const launcher = useRef<HTMLButtonElement>(null);

  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    const index = tools.findIndex(({ path }) => path === focused);
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = (index + 1) % tools.length;
        break;
      case 'ArrowLeft':
        next = (index + tools.length - 1) % tools.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = tools.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  return (
    <WorkspaceLayout
      hideSidebar
      centerContent
      slots={{
        sidebar: null,
        status: isTodo ? null : undefined,
        header: (
          <>
            <h1 className={styles.heading}>工具</h1>
            <div className={styles.bar} data-todo={isTodo || undefined}>
              <div
                className={styles.tabs}
                role="tablist"
                aria-label="工具切换"
                onKeyDown={moveFocus}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setFocusedPath(null);
                }}
              >
                {tools.map(({ path, label }, index) => (
                  <button
                    key={path}
                    type="button"
                    role="tab"
                    id={`${id}-tab-${index}`}
                    aria-controls={`${id}-panel-${index}`}
                    aria-selected={tool.path === path}
                    tabIndex={focused === path ? 0 : -1}
                    className={styles.tab}
                    onFocus={() => setFocusedPath(path)}
                    onClick={() => {
                      if (tool.path !== path) void navigate(path);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <WindowLauncher
                ref={launcher}
                label={`独立窗口打开${tool.label}`}
                onClick={(event) => openTool(tool.path, event.currentTarget)}
              />
            </div>
          </>
        ),
        content: tools.map(({ path }, index) => (
          <section
            key={path}
            role="tabpanel"
            id={`${id}-panel-${index}`}
            aria-labelledby={`${id}-tab-${index}`}
            hidden={tool.path !== path}
          >
            {tool.path === path && (
              <>
                <div ref={register} tabIndex={-1} hidden={windowed} />
                {windowed && (
                  <div className={styles.notice}>
                    <p>{tool.label}已在小窗打开</p>
                    <Button
                      variant="secondary"
                      onClick={(event) => openTool(path, launcher.current ?? event.currentTarget)}
                    >
                      继续小窗
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        )),
      }}
    />
  );
}
