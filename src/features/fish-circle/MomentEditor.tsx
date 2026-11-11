import { useState, type RefObject } from 'react';
import type { Draft, FishCirclePort, Moment } from '@/domain/fish-circle';
import { Dialog } from '@/shared/ui/Dialog';
import { useOperation } from './use-operation';
import styles from './Circle.module.css';
interface Props {
  returnFocusRef?: RefObject<HTMLElement | null>;
  service: FishCirclePort;
  original: Moment | null;
  onSaved: () => void;
  onClose: () => void;
}
export function MomentEditor({ service, original, onSaved, onClose, returnFocusRef }: Props) {
  const [draft, setDraft] = useState<Draft>({
    content: original?.content ?? '',
    location: original?.location ?? '',
    media: original?.media ?? [],
  });
  const save = useOperation();
  const upload = useOperation();
  const busy = save.pending || upload.pending;
  return (
    <Dialog
      {...(returnFocusRef ? { returnFocusRef } : {})}
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title={original ? '编辑动态' : '发布动态'}
      description={
        original ? '修改内容，保留原有可见范围。' : '和岛友分享此刻，发布后所有朋友可见。'
      }
      showCloseAction={false}
      dismissLabel="关闭编辑器"
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy)
            void save
              .run((signal) => service.save(draft, original, signal))
              .then((ok) => {
                if (ok) onSaved();
              });
        }}
      >
        <label>
          动态内容
          <textarea
            aria-label="动态内容"
            rows={5}
            maxLength={5000}
            value={draft.content}
            disabled={save.pending}
            onChange={(e) => setDraft({ ...draft, content: e.target.value })}
            placeholder="分享你的摸鱼日常…"
          />
        </label>
        <div className={styles.media}>
          {draft.media.map((m, i) => (
            <div key={`${m.url}-${i}`}>
              {m.type === 'image' ? (
                <img src={m.url} alt={`待发布图片 ${i + 1}`} referrerPolicy="no-referrer" />
              ) : (
                <span>视频</span>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => setDraft({ ...draft, media: draft.media.filter((_, n) => n !== i) })}
              >
                移除附件 {i + 1}
              </button>
            </div>
          ))}
        </div>
        <label>
          添加图片（最多 9 张，每张不超过 10MB）
          <input
            type="file"
            aria-label="添加图片"
            accept="image/jpeg,image/png,image/gif,image/webp"
            disabled={busy || draft.media.length >= 9}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file)
                void upload
                  .run((signal) => service.upload(file, signal))
                  .then((media) => {
                    if (media) setDraft((d) => ({ ...d, media: [...d.media, media].slice(0, 9) }));
                  });
            }}
          />
        </label>
        {upload.pending && <p role="status">正在上传图片…</p>}
        <label>
          位置
          <input
            aria-label="位置"
            maxLength={100}
            value={draft.location}
            disabled={save.pending}
            onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            placeholder="可选"
          />
        </label>
        {(save.error || upload.error) && <p role="alert">{save.error || upload.error}</p>}
        <div className={styles.actions}>
          <button type="button" disabled={busy} onClick={onClose}>
            取消
          </button>
          <button type="submit" disabled={busy || (!draft.content.trim() && !draft.media.length)}>
            {save.pending ? '正在保存…' : original ? '保存修改' : '发布'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
