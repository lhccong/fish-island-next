import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import styles from './AboutExtras.module.css';

export function AboutImage({ src, alt }: { src: string; alt: string }) {
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [attempt, setAttempt] = useState(0);
  return (
    <div className={styles.image}>
      {state === 'loading' && <p role="status">正在加载{alt}…</p>}
      {state !== 'error' && (
        <img
          key={attempt}
          src={src}
          alt={alt}
          onLoad={() => setState('ready')}
          onError={() => setState('error')}
        />
      )}
      {state === 'error' && (
        <>
          <p role="alert">{alt}加载失败</p>
          <Button
            variant="secondary"
            onClick={() => {
              setState('loading');
              setAttempt((value) => value + 1);
            }}
          >
            重试图片
          </Button>
        </>
      )}
    </div>
  );
}
