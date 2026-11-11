import { useState } from 'react';
import styles from './SourceAvatar.module.css';

interface SourceAvatarProps {
  name: string;
  src: string | null;
  size?: 'default' | 'small';
}

export function SourceAvatar({ name, src, size = 'default' }: SourceAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  return (
    <span className={`${styles.avatar} ${size === 'small' ? styles.small : ''}`} aria-hidden="true">
      {name.slice(0, 1)}
      {src && failedSrc !== src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          onLoad={() => setLoadedSrc(src)}
          data-loaded={loadedSrc === src}
        />
      ) : null}
    </span>
  );
}
