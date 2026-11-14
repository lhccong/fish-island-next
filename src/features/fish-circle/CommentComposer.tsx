import { useEffect, useId, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import type { Comment, FishCirclePort, Media } from '@/domain/fish-circle';
import { Button } from '@/shared/ui/Button';
import { CommentEmoticons } from './CommentEmoticons';
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
  const [mediaError, setMediaError] = useState('');
  async function uploadImages(files: File[]) {
    if (busy) return;
    setMediaError('');
    if (files.length > 3 - images.length) {
      setMediaError('每条评论最多添加 3 张图片，请移除附件后重试');
      return;
    }
    await upload.run(async (signal) => {
      for (const file of files) {
        const media = await service.upload(file, signal);
        if (signal.aborted) return;
        setImages((old) => [...old, media]);
      }
    });
  }
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
        if (busy || (!content.trim() && !images.length)) return;
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
        onPaste={(event) => {
          const files = Array.from(event.clipboardData.items)
            .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
            .flatMap((item) => {
              const file = item.getAsFile();
              return file ? [file] : [];
            });
          if (!files.length) return;
          event.preventDefault();
          void uploadImages(files);
        }}
      />
      {images.length > 0 && (
        <div className={styles.media}>
          {images.map((m, i) => (
            <div key={`${m.url}-${i}`}>
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
          multiple
          hidden
          accept="image/jpeg,image/png,image/gif,image/webp"
          disabled={busy || images.length >= 3}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            e.target.value = '';
            if (files.length) void uploadImages(files);
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
        <CommentEmoticons
          disabled={busy || images.length >= 3}
          onSelect={(url) => {
            if (busy || images.length >= 3) return;
            setMediaError('');
            setImages((old) => [...old, { type: 'image', url }]);
          }}
        />
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
      {(mediaError || send.error || upload.error) && (
        <p role="alert">{mediaError || send.error || upload.error}</p>
      )}
    </form>
  );
}
