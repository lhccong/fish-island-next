import { useState } from 'react';
import styles from './SourceAvatar.module.css';
import { AvatarFrame } from '@/shared/ui/AvatarFrame';

interface SourceAvatarProps {
  name: string;
  src: string | null;
  frameUrl?: string | undefined;
  size?: 'default' | 'small' | 'profile';
}

export function SourceAvatar({ name, src, frameUrl, size = 'default' }: SourceAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  return (
    <AvatarFrame src={frameUrl}>
      <span
        className={`${styles.avatar} ${size === 'small' ? styles.small : size === 'profile' ? styles.profile : ''}`}
        aria-hidden="true"
      >
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
    </AvatarFrame>
  );
}
