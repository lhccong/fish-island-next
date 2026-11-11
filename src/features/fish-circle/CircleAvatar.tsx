import { useState } from 'react';
import styles from './CircleAvatar.module.css';
export function CircleAvatar({
  name,
  src,
  size = 'default',
}: {
  name: string;
  src: string;
  size?: 'small' | 'default' | 'cover';
}) {
  const [failed, setFailed] = useState('');
  return (
    <span
      className={`${styles.avatar} ${size === 'small' ? styles.small : size === 'cover' ? styles.cover : ''}`}
      aria-hidden="true"
    >
      {name.slice(0, 1)}
      {src && failed !== src && (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setFailed(src)}
        />
      )}
    </span>
  );
}
