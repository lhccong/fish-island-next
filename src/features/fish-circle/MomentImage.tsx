import { useState } from 'react';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import styles from './MomentImage.module.css';
export function MomentImage({ src, alt }: { src: string; alt: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  return (
    <span className={styles.slot}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={() => setState('ready')}
        onError={() => setState('error')}
      />
      {state !== 'ready' && (
        <span className={styles.state}>
          {state === 'loading' ? (
            <LoadingIndicator compact>加载图片…</LoadingIndicator>
          ) : (
            <span role="alert">图片未能加载，点击查看</span>
          )}
        </span>
      )}
    </span>
  );
}
