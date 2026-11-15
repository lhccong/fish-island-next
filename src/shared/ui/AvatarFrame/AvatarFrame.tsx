import { useState, type ReactNode } from 'react';
import styles from './AvatarFrame.module.css';

export function AvatarFrame({
  src,
  children,
}: {
  src?: string | null | undefined;
  children: ReactNode;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src) return children;
  return (
    <span className={styles.frame} data-avatar-frame>
      {children}
      {failed !== src && (
        <img
          className={styles.overlay}
          src={src}
          alt=""
          aria-hidden="true"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(src)}
        />
      )}
    </span>
  );
}
