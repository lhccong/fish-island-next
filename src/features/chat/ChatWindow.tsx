import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useChatWindow } from './chat-window-context';
import { createPortal } from 'react-dom';
import { ExternalLink, MessageCircle, Sheet } from 'lucide-react';
import { FloatingWindow } from '@/shared/ui/FloatingWindow';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import type { ChatPresentation } from './chat-presentation';
import styles from './ChatWindow.module.css';

export function ChatWindow({
  groupName,
  children,
  standalone = false,
  miniChatHref,
}: {
  groupName: string;
  standalone?: boolean;
  miniChatHref?: string;
  children: (floating: boolean, toggle: () => void, presentation: ChatPresentation) => ReactNode;
}) {
  const {
    mode,
    setMode,
    open,
    restore: restoreChat,
    suspended,
    presentation,
    setPresentation,
  } = useChatWindow();
  const [host] = useState(() => {
    const element = document.createElement('div');
    element.className = styles.host!;
    return element;
  });
  const inlineRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const resumeRef = useRef<HTMLButtonElement>(null);
  const wasFloating = useRef(false);
  const floating = standalone || mode !== 'inline';
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
      {!standalone && (
        <div className={styles.host} ref={inlineRef}>
          {floating && (
            <div className={styles.placeholder}>
              <Button variant="secondary" onClick={restore}>
                返回完整聊天
              </Button>
            </div>
          )}
        </div>
      )}
      {floating && (
        <FloatingWindow
          title={presentation === 'worksheet' ? `${groupName}.xlsx — Excel` : groupName}
          titleContent={
            presentation === 'worksheet' ? (
              <>
                <Sheet size={18} aria-hidden="true" />
                Excel
              </>
            ) : undefined
          }
          appearance={presentation === 'worksheet' ? 'worksheet' : 'default'}
          standalone={standalone}
          variant="compact"
          actionName="聊天"
          hidden={(!standalone && mode === 'hidden') || suspended}
          onHide={() => setMode('hidden')}
          onClose={restore}
          returnFocusRef={resumeRef}
          headerAction={
            <div className={styles.headerActions}>
              <div className={styles.modeSelect}>
                <Select
                  label="小窗显示模式"
                  triggerIcon={
                    presentation === 'worksheet' ? (
                      <Sheet size={18} aria-hidden="true" />
                    ) : (
                      <MessageCircle size={18} aria-hidden="true" />
                    )
                  }
                  value={presentation}
                  options={[
                    { value: 'conversation', label: '聊天气泡' },
                    { value: 'worksheet', label: 'Excel 模式' },
                  ]}
                  onValueChange={(value) => {
                    if (value === 'conversation' || value === 'worksheet') setPresentation(value);
                  }}
                />
              </div>
              {!standalone && miniChatHref && (
                <a
                  className={styles.openTab}
                  href={miniChatHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="在新窗口打开聊天小窗"
                  title="在新窗口打开聊天小窗"
                  onClick={(event) => {
                    if (
                      event.button !== 0 ||
                      event.ctrlKey ||
                      event.metaKey ||
                      event.shiftKey ||
                      event.altKey
                    ) {
                      return;
                    }
                    event.preventDefault();
                    window.open(
                      event.currentTarget.href,
                      '_blank',
                      'popup,width=400,height=560,noopener,noreferrer',
                    );
                  }}
                >
                  <ExternalLink size={16} aria-hidden="true" />
                </a>
              )}
            </div>
          }
        >
          <div className={styles.host} ref={attachWindow} />
        </FloatingWindow>
      )}
      {!standalone &&
        mode === 'hidden' &&
        !suspended &&
        createPortal(
          <Button ref={resumeRef} className={styles.resume} onClick={() => setMode('floating')}>
            <MessageCircle size={18} aria-hidden="true" />
            恢复聊天小窗
          </Button>,
          document.body,
        )}
      {createPortal(
        children(floating, () => (floating ? restore() : open()), presentation),
        host,
      )}
    </>
  );
}
