import { useRef, useState, type RefObject } from 'react';
import { MapPin, Plus, X } from 'lucide-react';
import type { Draft, FishCirclePort, Moment } from '@/domain/fish-circle';
import { Dialog } from '@/shared/ui/Dialog';
import { Button } from '@/shared/ui/Button';
import { useOperation } from './use-operation';
import styles from './MomentEditor.module.css';
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
  const [hint, setHint] = useState('');
  const picker = useRef<HTMLInputElement>(null);
  const save = useOperation();
  const upload = useOperation();
  const busy = save.pending || upload.pending;
  function addFiles(files: File[]) {
    if (busy || !files.length) return;
    const available = Math.max(0, 9 - draft.media.length);
    setHint(files.length > available ? '最多添加 9 张图片，已按剩余数量上传。' : '');
    void upload.run(async (signal) => {
      for (const file of files.slice(0, available)) {
        const media = await service.upload(file, signal);
        if (!signal.aborted)
          setDraft((current) => ({
            ...current,
            media: current.media.some((item) => item.url === media.url)
              ? current.media
              : [...current.media, media],
          }));
      }
      return true;
    });
  }
  return (
    <Dialog
      {...(returnFocusRef ? { returnFocusRef } : {})}
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title={original ? '编辑动态' : '发布朋友圈'}
      description="和岛友分享新鲜事，可添加图片与位置。"
      hideDescription
      className={styles.dialog || ''}
      showCloseAction={false}
      dismissLabel="关闭编辑器"
    >
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy)
            void save
              .run((signal) => service.save(draft, original, signal))
              .then((ok) => {
                if (ok) onSaved();
              });
        }}
      >
        <textarea
          aria-label="动态内容"
          rows={4}
          maxLength={5000}
          value={draft.content}
          disabled={save.pending}
          onChange={(event) => setDraft({ ...draft, content: event.target.value })}
          placeholder={original ? '修改内容...' : '分享新鲜事...'}
          onPaste={(event) => {
            const files = Array.from(event.clipboardData.items)
              .filter((item) => item.type.startsWith('image/'))
              .flatMap((item) => {
                const file = item.getAsFile();
                return file ? [file] : [];
              });
            if (files.length) {
              event.preventDefault();
              addFiles(files);
            }
          }}
        />
        {draft.media.length > 0 && (
          <div className={styles.images}>
            {draft.media.map((media, index) => (
              <div className={styles.preview} key={media.url}>
                {media.type === 'image' ? (
                  <img
                    src={media.url}
                    alt={`待发布图片 ${index + 1}`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>视频</span>
                )}
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`移除附件 ${index + 1}`}
                  disabled={busy}
                  onClick={() =>
                    setDraft({ ...draft, media: draft.media.filter((_, n) => n !== index) })
                  }
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className={styles.upload}>
          <input
            ref={picker}
            type="file"
            aria-label="添加图片"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            hidden
            disabled={busy || draft.media.length >= 9}
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              event.target.value = '';
              addFiles(files);
            }}
          />
          <button
            type="button"
            disabled={busy || draft.media.length >= 9}
            onClick={() => picker.current?.click()}
          >
            <Plus size={16} aria-hidden="true" />
            添加图片
          </button>
          <span>
            {draft.media.length
              ? `已选择 ${draft.media.length}/9 张图片，可直接粘贴图片`
              : '可直接粘贴图片上传'}
          </span>
        </div>
        {upload.pending && <p role="status">正在上传图片…</p>}
        {hint && <p role="status">{hint}</p>}
        <label className={styles.location}>
          <MapPin size={16} aria-hidden="true" />
          <input
            aria-label="位置"
            maxLength={50}
            value={draft.location}
            disabled={save.pending}
            onChange={(event) => setDraft({ ...draft, location: event.target.value })}
            placeholder="添加位置（选填）"
          />
          {draft.location && (
            <button
              type="button"
              aria-label="清除位置"
              disabled={save.pending}
              onClick={() => setDraft({ ...draft, location: '' })}
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </label>
        {(save.error || upload.error) && <p role="alert">{save.error || upload.error}</p>}
        <div className={styles.footer}>
          <Button variant="secondary" className={styles.action} disabled={busy} onClick={onClose}>
            取消
          </Button>
          <Button
            className={styles.action}
            type="submit"
            disabled={busy || (!draft.content.trim() && !draft.media.length)}
          >
            {save.pending ? '正在保存…' : original ? '保存修改' : '发布'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
