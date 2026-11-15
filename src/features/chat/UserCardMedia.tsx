import { useState } from 'react';
import styles from './UserCard.module.css';
export function UserCardMedia({
  src,
  name,
  frame = false,
}: {
  src: string;
  name: string;
  frame?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return frame ? null : <div className={styles.coverEmpty}>封面暂时无法显示</div>;
  return (
    <img
      className={frame ? styles.frame : styles.cover}
      src={src}
      alt={frame ? '' : `${name}的封面`}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
