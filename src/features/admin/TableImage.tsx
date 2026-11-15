import { useState } from 'react';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import styles from './TableImage.module.css';
export function TableImage({ src, name }: { src: string; name: string }) {
  const [loaded, setLoaded] = useState('');
  const [failed, setFailed] = useState('');
  if (!/^https?:\/\//.test(src) || failed === src)
    return <span className={styles.fallback}>{name.slice(0, 1) || '—'}</span>;
  return (
    <div className={styles.image}>
      {loaded !== src && <LoadingIndicator compact>加载中</LoadingIndicator>}
      <img
        src={src}
        alt={name}
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(src)}
        onError={() => setFailed(src)}
        data-loaded={loaded === src}
      />
    </div>
  );
}
