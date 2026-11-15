import { useRef, useState } from 'react';
import type { Media } from '@/domain/fish-circle';
import { ImageViewer } from '@/shared/ui/ImageViewer';
import styles from './Circle.module.css';
import { MomentImage } from './MomentImage';

export function MediaGrid({ media }: { media: Media[] }) {
  const [preview, setPreview] = useState<number | null>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const images = media.filter((item) => item.type === 'image');
  return (
    <>
      <div className={styles.media} data-count={media.length} data-circle-media>
        {media.map((m, i) =>
          m.type === 'image' ? (
            <button
              key={`${m.url}-${i}`}
              type="button"
              aria-label={`查看图片 ${i + 1}`}
              onClick={(event) => {
                returnFocus.current = event.currentTarget;
                setPreview(images.indexOf(m));
              }}
            >
              <MomentImage src={m.url} alt={`动态图片 ${i + 1}`} />
            </button>
          ) : (
            <video key={`${m.url}-${i}`} src={m.url} controls preload="metadata" />
          ),
        )}
      </div>
      {preview !== null && (
        <ImageViewer
          images={images.map((image) => ({ url: image.url, alt: '动态原图' }))}
          initialIndex={preview}
          onClose={() => setPreview(null)}
          returnFocusRef={returnFocus}
        />
      )}
    </>
  );
}
