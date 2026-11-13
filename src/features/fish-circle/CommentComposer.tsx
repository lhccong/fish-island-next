import { useEffect, useId, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import type { Comment, FishCirclePort, Media } from '@/domain/fish-circle';
import { Button } from '@/shared/ui/Button';
import { useOperation } from './use-operation';
import styles from './CommentComposer.module.css';
interface Props {
  service: FishCirclePort;
  momentId: string;
  reply: Comment | null;
  onCancelReply: () => void;
  onSent: () => void;
}
export function CommentComposer({ service, momentId, reply, onCancelReply, onSent }: Props) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<Media[]>([]);
  const picker = useRef<HTMLInputElement>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const replyContext = useId();
  const send = useOperation();
  const upload = useOperation();
  const busy = send.pending || upload.pending;
  useEffect(() => {
    form.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    editor.current?.focus({ preventScroll: true });
  }, [reply]);
  return (
    <form
      ref={form}
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (busy) return;
        void send
          .run((signal) => service.comment(momentId, content.trim(), reply, images, signal))
          .then((ok) => {
            if (ok) {
              setContent('');
              setImages([]);
              onSent();
            }
          });
      }}
    >
      {reply && (
        <div className={styles.reply}>
          <div className={styles.replyHeader}>
            <span id={replyContext} className={styles.replyTarget}>
              回复 <strong title={reply.userName}>{reply.userName}</strong>
            </span>
            <Button variant="secondary" disabled={busy} onClick={onCancelReply}>
              取消回复
            </Button>
          </div>
          <p className={styles.quote}>{reply.content || '图片评论'}</p>
        </div>
      )}
      <textarea
        ref={editor}
        aria-describedby={reply ? replyContext : undefined}
        aria-label="评论内容"
        placeholder="写评论…"
        rows={2}
        maxLength={2000}
        disabled={busy}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      {images.length > 0 && (
        <div className={styles.media}>
          {images.map((m, i) => (
            <div key={m.url}>
              <img src={m.url} alt={`评论附件 ${i + 1}`} referrerPolicy="no-referrer" />
              <Button
                variant="secondary"
                className={styles.remove || ''}
                aria-label={`移除评论附件 ${i + 1}`}
                disabled={busy}
                onClick={() => setImages(images.filter((_, index) => index !== i))}
              >
                <X size={16} aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className={styles.toolbar}>
        <input
          ref={picker}
          aria-label="评论图片"
          type="file"
          hidden
          accept="image/jpeg,image/png,image/gif,image/webp"
          disabled={busy || images.length >= 3}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file)
              void upload
                .run((signal) => service.upload(file, signal))
                .then((media) => {
                  if (media) setImages((old) => [...old, media].slice(0, 3));
                });
          }}
        />
        <Button
          variant="secondary"
          disabled={busy || images.length >= 3}
          onClick={() => picker.current?.click()}
        >
          <ImagePlus size={16} aria-hidden="true" />
          添加评论图片
        </Button>
        <span className={styles.count}>{images.length}/3 张</span>
        <Button
          type="submit"
          className={styles.send || ''}
          disabled={busy || (!content.trim() && !images.length)}
        >
          {send.pending ? '正在发送…' : '发送评论'}
        </Button>
      </div>
      {upload.pending && <p role="status">正在上传评论图片…</p>}
      {(send.error || upload.error) && <p role="alert">{send.error || upload.error}</p>}
    </form>
  );
}
