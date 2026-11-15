import { useState } from 'react';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import styles from './BossSprite.module.css';

export function BossSprite({ name, size = 120 }: { name: string; size?: number }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  return (
    <span className={styles.sprite} style={{ width: size, height: size }}>
      {status === 'loading' && <LoadingIndicator compact>加载反派…</LoadingIndicator>}
      {status === 'error' ? (
        <span role="img" aria-label={`${name}的图片暂不可用`} className={styles.fallback}>
          图片暂不可用
        </span>
      ) : (
        <picture hidden={status === 'loading'}>
          <source
            media="(prefers-reduced-motion: reduce)"
            srcSet="/assets/pet/villain-idle-still.webp"
          />
          <img
            src="/assets/pet/villain-idle.webp"
            alt={name}
            width={256}
            height={256}
            draggable={false}
            onLoad={() => setStatus('ready')}
            onError={() => setStatus('error')}
          />
        </picture>
      )}
    </span>
  );
}
