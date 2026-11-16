import { useState } from 'react';
import styles from './UserAvatar.module.css';

export function UserAvatar({ name, src }: { name: string; src?: string | null | undefined }) {
  const [failed, setFailed] = useState<string | null>(null);
  const valid = src && /^https?:\/\//i.test(src);
  return (
    <span className={styles.avatar} data-user-avatar>
      {valid && failed !== src ? (
        <img
          src={src}
          alt={`${name}的头像`}
          referrerPolicy="no-referrer"
          onError={() => setFailed(src)}
        />
      ) : (
        <span role="img" aria-label={`${name}的头像占位`}>
          {Array.from(name.trim())[0] || '岛'}
        </span>
      )}
    </span>
  );
}
