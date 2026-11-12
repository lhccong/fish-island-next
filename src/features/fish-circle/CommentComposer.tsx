import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import type { Comment, FishCirclePort, Media } from '@/domain/fish-circle';
import { Button } from '@/shared/ui/Button';
import { useOperation } from './use-operation';
import styles from './Circle.module.css';
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
  const send = useOperation();
  const upload = useOperation();
  const busy = send.pending || upload.pending;
  return (
    <form
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
        <div>
          回复 {reply.userName}
          <button type="button" disabled={busy} onClick={onCancelReply}>
            取消回复
          </button>
        </div>
      )}
      <textarea
        aria-label="评论内容"
        placeholder="写评论…"
        rows={2}
        maxLength={2000}
        disabled={busy}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className={styles.media}>
        {images.map((m, i) => (
          <div key={m.url}>
            <img src={m.url} alt={`评论附件 ${i + 1}`} referrerPolicy="no-referrer" />
            <button
              type="button"
              disabled={busy}
              onClick={() => setImages(images.filter((_, index) => index !== i))}
            >
              移除评论附件 {i + 1}
            </button>
          </div>
        ))}
      </div>
      <div className={styles.commentUpload}>
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
        <span>{images.length}/3 张图片</span>
      </div>
      {upload.pending && <p role="status">正在上传评论图片…</p>}
      <button type="submit" disabled={busy || (!content.trim() && !images.length)}>
        {send.pending ? '正在发送…' : '发送评论'}
      </button>
      {(send.error || upload.error) && <p role="alert">{send.error || upload.error}</p>}
    </form>
  );
}
