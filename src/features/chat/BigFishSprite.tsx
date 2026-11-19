import { useState } from 'react';
import { Fish } from 'lucide-react';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import styles from './BigFishSprite.module.css';

export function BigFishSprite() {
  const [image, setImage] = useState<'loading' | 'ready' | 'error'>('loading');

  return (
    <span className={styles.sprite} data-image={image}>
      {image === 'loading' && <LoadingIndicator compact>加载中</LoadingIndicator>}
      {image === 'error' && <Fish size={24} aria-hidden="true" />}
      {image !== 'error' && (
        <img
          alt=""
          decoding="async"
          loading="lazy"
          src="/assets/chat/big-fish.webp"
          onLoad={() => setImage('ready')}
          onError={() => setImage('error')}
        />
      )}
    </span>
  );
}
