import { useState } from 'react';
import type { Media } from '@/domain/fish-circle';
import { Dialog } from '@/shared/ui/Dialog';
import styles from './Circle.module.css';
export function MediaGrid({ media }: { media: Media[] }) {
  const [preview, setPreview] = useState<Media | null>(null);
  return (
    <>
      <div className={styles.media} data-count={media.length}>
        {media.map((m, i) =>
          m.type === 'image' ? (
            <button
              key={`${m.url}-${i}`}
              type="button"
              aria-label={`查看图片 ${i + 1}`}
              onClick={() => setPreview(m)}
            >
              <img
                src={m.url}
                alt={`动态图片 ${i + 1}`}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </button>
          ) : (
            <video key={`${m.url}-${i}`} src={m.url} controls preload="metadata" />
          ),
        )}
      </div>
      <Dialog
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        title="图片预览"
        description="查看动态原图"
        dismissLabel="关闭图片预览"
      >
        {preview && (
          <img
            className={styles.preview}
            src={preview.url}
            alt="动态原图"
            referrerPolicy="no-referrer"
          />
        )}
      </Dialog>
    </>
  );
}
