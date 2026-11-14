import { useStore } from 'zustand';
import { useId, useRef, useState, type ReactNode } from 'react';
import { Folder, Plus, Scissors } from 'lucide-react';
import { EmoticonLauncher } from './EmoticonLauncher';
import { EmoticonFeedback } from './EmoticonFeedback';
import { RedPacketLauncher } from './RedPacketLauncher';
import { Button } from '@/shared/ui/Button';
import { useChatRealtime } from './realtime-context';
import { DraftQuote } from './DraftQuote';
import { ComposerImage } from './ComposerImage';
import { ChatEditor } from './ChatEditor';
import { ChatImageLauncher } from './ChatImageLauncher';
import styles from './ChatWorkspace.module.css';
import type { ChatPresentation } from './chat-presentation';

export function ChatComposer({
  presentation = 'conversation',
  toolbarAction,
}: {
  presentation?: ChatPresentation;
  toolbarAction?: ReactNode;
}) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsId = useId();
  const toolsTrigger = useRef<HTMLButtonElement>(null);
  const { draft, composerRef, controller, user, imageUpload } = useChatRealtime();
  const image = useStore(imageUpload.store, (state) => state);
  const text = useStore(draft.store, (state) => state.text);
  const quote = useStore(draft.store, (state) => state.quote);
  const feedback = useStore(draft.store, (state) => state.feedback);
  const content = (image.status === 'ready' ? `[img]${image.url}[/img]` : '') + text;
  const imageBusy = image.status === 'uploading' || image.status === 'error';
  const send = () => {
    if (!user || !content.trim() || imageBusy) return;
    if (content.length > 5000) return draft.notify('消息不能超过 5000 字', 'error');
    const quoted = quote
      ? Object.values(controller.store.getState().messages).find((m) => m.id === quote.id)
      : null;
    if (quote && (!quoted || quoted.revoked))
      return draft.notify('引用消息已撤回或不在当前窗口，请取消引用后发送', 'error');
    if (!controller.sender.send(content, quote?.id, user))
      return draft.notify('待处理消息过多，请重试或处理失败消息后发送', 'error');
    draft.setText('');
    draft.clearQuote();
    imageUpload.clear();
    composerRef.current?.focus({ preventScroll: true });
  };
  return (
    <section
      className={styles.composer}
      aria-label="群聊输入区"
      data-tools-open={toolsOpen}
      data-presentation={presentation}
      onKeyDown={(event) => {
        if (
          event.key === 'Escape' &&
          toolsOpen &&
          !event.defaultPrevented &&
          event.target instanceof Node &&
          event.currentTarget.contains(event.target)
        ) {
          setToolsOpen(false);
          toolsTrigger.current?.focus();
        }
      }}
    >
      {quote && (
        <DraftQuote id={quote.id} senderName={quote.senderName} onDismiss={draft.clearQuote} />
      )}
      <ComposerImage />
      <div className={styles.inputRow}>
        <div className={styles.tools}>
          <EmoticonLauncher />
          <ChatImageLauncher />
          <Button
            ref={toolsTrigger}
            variant="secondary"
            className={styles.moreTools}
            aria-label="更多聊天工具"
            aria-expanded={toolsOpen}
            aria-controls={toolsId}
            onClick={() => setToolsOpen((open) => !open)}
          >
            <Plus size={24} aria-hidden="true" />
          </Button>
          <div id={toolsId} className={styles.extraTools}>
            <RedPacketLauncher key={user?.id ?? ''} />
            <button type="button" disabled aria-label="文件（暂未接入）">
              <Folder size={20} />
            </button>
            <button type="button" disabled aria-label="截图（暂未接入）">
              <Scissors size={20} />
            </button>
          </div>
        </div>
        <div className={styles.editorSlot}>
          {presentation === 'worksheet' && (
            <span className={styles.formulaIcon} aria-hidden="true">
              ƒx
            </span>
          )}
          <div className={styles.editorInput}>
            <ChatEditor
              presentation={presentation}
              onSend={send}
              onPaste={(event) => {
                const files = Array.from(event.clipboardData.items)
                  .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
                  .map((item) => item.getAsFile())
                  .filter((file): file is File => file !== null);
                if (!files.length) return;
                event.preventDefault();
                if (!user) return draft.notify('请登录后上传图片', 'error');
                if (files.length > 1) return draft.notify('一次只能粘贴一张图片', 'error');
                if (!imageUpload.paste(files[0]!))
                  draft.notify('请先发送或移除当前图片，再粘贴新图片', 'error');
              }}
            />
          </div>
        </div>
        <div className={styles.actions}>
          <div className={styles.composerFeedback}>
            <EmoticonFeedback />
            {feedback && (
              <span role="status" data-tone={feedback.kind}>
                {feedback.text}
              </span>
            )}
            {content.length > 5000 && <span role="status">消息不能超过 5000 字</span>}
          </div>
          <span className={styles.shortcutHint}>手机回车换行，电脑 Shift+Enter 换行</span>
          <Button
            disabled={!user || !content.trim() || content.length > 5000 || imageBusy}
            onClick={send}
          >
            发送
          </Button>
        </div>
        {toolbarAction && <div className={styles.toolbarAction}>{toolbarAction}</div>}
      </div>
    </section>
  );
}
