import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import styles from './MessageMedia.module.css';

export function MessageImage({ url }: { url: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  return (
    <span className={styles.imageFrame} data-image-state={state}>
      {state !== 'error' && (
        <img
          key={attempt}
          src={url}
          alt="聊天图片"
          width={320}
          height={240}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setState('ready')}
          onError={() => setState('error')}
        />
      )}
      {state === 'loading' && <span className={styles.imageStatus}>图片加载中…</span>}
      {state === 'error' && (
        <span className={styles.imageStatus}>
          <span>图片加载失败</span>
          <Button
            variant="secondary"
            onClick={() => {
              setAttempt((value) => value + 1);
              setState('loading');
            }}
          >
            重新加载图片
          </Button>
        </span>
      )}
    </span>
  );
}
