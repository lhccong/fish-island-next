import { useStore } from 'zustand';
import { Folder, Scissors } from 'lucide-react';
import { EmoticonLauncher } from './EmoticonLauncher';
import { EmoticonFeedback } from './EmoticonFeedback';
import { RedPacketLauncher } from './RedPacketLauncher';
import { Button } from '@/shared/ui/Button';
import { useChatRealtime } from './realtime-context';
import { DraftQuote } from './DraftQuote';
import { ComposerImage } from './ComposerImage';
import { ChatEditor } from './ChatEditor';
import styles from './ChatWorkspace.module.css';

export function ChatComposer() {
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
      <ComposerImage />
      <ChatEditor
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
      <div className={styles.actions}>
        <div className={styles.composerFeedback}>
          <EmoticonFeedback />
          {feedback && (
            <span role="status" data-tone={feedback.kind}>
              {feedback.text}
            </span>
          )}
          <span>
            {content.length > 5000 ? '消息不能超过 5000 字' : '手机回车换行，电脑 Shift+Enter 换行'}
          </span>
        </div>
        <Button
          disabled={!user || !content.trim() || content.length > 5000 || imageBusy}
          onClick={send}
        >
          发送
        </Button>
      </div>
    </section>
  );
}
