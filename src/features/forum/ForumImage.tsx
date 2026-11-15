import { useState } from 'react';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { Button } from '@/shared/ui/Button';
import { ImageViewer } from '@/shared/ui/ImageViewer';
import styles from './Forum.module.css';
export function ForumImage({ src, alt = '' }: { src: string; alt?: string }) {
  const [state, setState] = useState('loading');
  const [revision, setRevision] = useState(0);
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.image}>
      {state === 'loading' && <LoadingIndicator compact>正在加载图片…</LoadingIndicator>}
      {state === 'error' ? (
        <Button
          variant="secondary"
          onClick={() => {
            setRevision((n) => n + 1);
            setState('loading');
          }}
        >
          重新加载图片
        </Button>
      ) : (
        <button
          type="button"
          aria-label={`查看图片${alt ? `：${alt}` : ''}`}
          onClick={() => setOpen(true)}
        >
          <img
            key={revision}
            src={src}
            alt={alt}
            loading="lazy"
            onLoad={() => setState('ready')}
            onError={() => setState('error')}
          />
        </button>
      )}
      {open && (
        <ImageViewer images={[{ url: src, alt }]} initialIndex={0} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
