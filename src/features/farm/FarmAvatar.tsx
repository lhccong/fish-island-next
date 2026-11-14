import { useState } from 'react';
import styles from './FarmSocial.module.css';
export function FarmAvatar({
  name,
  src,
  small = false,
}: {
  name: string;
  src: string;
  small?: boolean;
}) {
  const [failed, setFailed] = useState('');
  return (
    <span
      className={`${styles.avatar} ${small ? styles.smallAvatar : ''}`}
      role="img"
      aria-label={`${name || '岛友'}的头像`}
    >
      {src && failed !== src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(src)}
        />
      ) : (
        (name || '鱼').slice(0, 1)
      )}
    </span>
  );
}
