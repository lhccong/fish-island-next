import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useChatWindow } from './chat-window-context';
import { createPortal } from 'react-dom';
import { MessageCircle } from 'lucide-react';
import { FloatingWindow } from '@/shared/ui/FloatingWindow';
import { Button } from '@/shared/ui/Button';
import styles from './ChatWindow.module.css';

export function ChatWindow({
  groupName,
  children,
}: {
  groupName: string;
  children: (floating: boolean, toggle: () => void) => ReactNode;
}) {
  const { mode, setMode, open, restore: restoreChat, suspended } = useChatWindow();
  const [host] = useState(() => {
    const element = document.createElement('div');
    element.className = styles.host!;
    return element;
  });
  const inlineRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const resumeRef = useRef<HTMLButtonElement>(null);
  const wasFloating = useRef(false);
  const floating = mode !== 'inline';
  useLayoutEffect(() => {
    const destination = floating ? windowRef.current : inlineRef.current;
    destination?.append(host);
    if (!floating && wasFloating.current) {
      const inline = host.querySelector<HTMLButtonElement>('button[aria-label="小窗模式"]');
      const trigger = inline?.getClientRects().length
        ? inline
        : host.querySelector<HTMLButtonElement>('button[aria-label="更多聊天工具"]');
      trigger?.focus();
    }
    wasFloating.current = floating;
  }, [floating, host]);
  useLayoutEffect(() => () => host.remove(), [host]);
  const attachWindow = useCallback(
    (node: HTMLDivElement | null) => {
      windowRef.current = node;
      node?.append(host);
    },
    [host],
  );
  const restore = () => {
    restoreChat();
  };
  return (
    <>
      <div className={styles.host} ref={inlineRef}>
        {floating && (
          <div className={styles.placeholder}>
            <Button variant="secondary" onClick={restore}>
              返回完整聊天
            </Button>
          </div>
        )}
      </div>
      {floating && (
        <FloatingWindow
          title={groupName}
          variant="compact"
          actionName="聊天"
          hidden={mode === 'hidden' || suspended}
          onHide={() => setMode('hidden')}
          onClose={restore}
          returnFocusRef={resumeRef}
        >
          <div className={styles.host} ref={attachWindow} />
        </FloatingWindow>
      )}
      {mode === 'hidden' &&
        !suspended &&
        createPortal(
          <Button ref={resumeRef} className={styles.resume} onClick={() => setMode('floating')}>
            <MessageCircle size={18} aria-hidden="true" />
            恢复聊天小窗
          </Button>,
          document.body,
        )}
      {createPortal(
        children(floating, () => (floating ? restore() : open())),
        host,
      )}
    </>
  );
}
