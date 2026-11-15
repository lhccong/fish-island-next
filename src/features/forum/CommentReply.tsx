import { useState } from 'react';
import type { AuthUser } from '@/domain/auth';
import type { ForumPort, ForumComment } from '@/domain/forum';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { useOperation } from './use-operation';
import styles from './Forum.module.css';
import { useImageUpload } from './use-image-upload';
import { CommentUpload } from './CommentUpload';

export function CommentReply({
  service,
  postId,
  item,
  rootId,
  user,
  onLogin,
  onSent,
}: {
  service: ForumPort;
  postId: string;
  item: ForumComment;
  rootId: string;
  user: AuthUser | null;
  onLogin: () => void;
  onSent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const operation = useOperation();
  const upload = useImageUpload(service, (url) =>
    setText((value) => `${value}\n[img]${url}[/img]`),
  );
  return (
    <>
      <Button variant="secondary" onClick={() => (user ? setOpen(true) : onLogin())}>
        回复
      </Button>
      {open && (
        <Dialog
          open
          className={styles.dialog ?? ''}
          title={`回复 ${item.author}`}
          description="回复会通知对方。"
          dismissLabel="关闭回复"
          showCloseAction={false}
          onOpenChange={(v) => {
            if (!operation.busy && !upload.busy) setOpen(v);
          }}
        >
          <ScrollArea label="回复正文" gutter="reserved" className={styles.scroll ?? ''}>
            <label className={styles.field}>
              回复内容
              <textarea
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onPaste={upload.onPaste}
                disabled={operation.busy}
                maxLength={4000}
              />
            </label>
            <div className={styles.dialogBody}>
              <CommentUpload
                busy={upload.busy}
                message={upload.message}
                disabled={operation.busy}
                onUpload={upload.upload}
              />
            </div>
          </ScrollArea>
          {operation.message && <p role="alert">{operation.message}</p>}
          <div className={styles.actions}>
            <Button
              variant="secondary"
              disabled={operation.busy || upload.busy}
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button
              disabled={operation.busy || upload.busy || !text.trim()}
              onClick={() =>
                void operation.run(async (signal) => {
                  await service.reply(postId, text.trim(), item.id, rootId, signal);
                  if (!signal.aborted) {
                    setText('');
                    setOpen(false);
                    onSent();
                  }
                })
              }
            >
              {operation.busy ? <LoadingIndicator compact>正在发送…</LoadingIndicator> : '发送回复'}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
