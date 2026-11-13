import { useRef } from 'react';
import { useStore } from 'zustand';
import { Folder, Scissors } from 'lucide-react';
import { EmoticonLauncher } from './EmoticonLauncher';
import { EmoticonFeedback } from './EmoticonFeedback';
import { RedPacketLauncher } from './RedPacketLauncher';
import { Button } from '@/shared/ui/Button';
import { useChatRealtime } from './realtime-context';
import { DraftQuote } from './DraftQuote';
import styles from './ChatWorkspace.module.css';

export function ChatComposer() {
  const { draft, composerRef, controller, user } = useChatRealtime();
  const text = useStore(draft.store, (state) => state.text);
  const quote = useStore(draft.store, (state) => state.quote);
  const feedback = useStore(draft.store, (state) => state.feedback);
  const composing = useRef(false);
  const send = () => {
    if (!user || !text.trim()) return;
    if (text.length > 5000) return draft.notify('消息不能超过 5000 字', 'error');
    const quoted = quote
      ? Object.values(controller.store.getState().messages).find((m) => m.id === quote.id)
      : null;
    if (quote && (!quoted || quoted.revoked))
      return draft.notify('引用消息已撤回或不在当前窗口，请取消引用后发送', 'error');
    if (!controller.sender.send(text, quote?.id, user))
      return draft.notify('待处理消息过多，请重试或处理失败消息后发送', 'error');
    draft.setText('');
    draft.clearQuote();
    draft.notify('消息已提交');
    composerRef.current?.focus({ preventScroll: true });
  };
  return (
    <section className={styles.composer} aria-label="群聊输入区">
      <div className={styles.tools}>
        <EmoticonLauncher />
        <RedPacketLauncher key={user?.id ?? ''} />
        <button type="button" disabled aria-label="文件（暂未接入）">
          <Folder size={20} />
        </button>
        <button type="button" disabled aria-label="截图（暂未接入）">
          <Scissors size={20} />
        </button>
      </div>
      {quote && (
        <DraftQuote id={quote.id} senderName={quote.senderName} onDismiss={draft.clearQuote} />
      )}
      <textarea
        ref={composerRef}
        aria-label="消息草稿"
        placeholder="写点什么…"
        value={text}
        onChange={(event) => draft.setText(event.target.value)}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
        }}
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing &&
            !composing.current &&
            event.nativeEvent.keyCode !== 229 &&
            window.matchMedia('(min-width: 761px)').matches
          ) {
            event.preventDefault();
            send();
          }
        }}
      />
      <div className={styles.actions}>
        <div className={styles.composerFeedback}>
          <EmoticonFeedback />
          {feedback && (
            <span role="status" data-tone={feedback.kind}>
              {feedback.text}
            </span>
          )}
          <span>
            {text.length > 5000 ? '消息不能超过 5000 字' : '手机回车换行，电脑 Shift+Enter 换行'}
          </span>
        </div>
        <Button disabled={!user || !text.trim() || text.length > 5000} onClick={send}>
          发送
        </Button>
      </div>
    </section>
  );
}
