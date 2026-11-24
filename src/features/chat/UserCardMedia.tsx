import { useState } from 'react';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
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
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  return (
    <>
      {status !== 'error' && (
        <img
          className={frame ? styles.frame : styles.cover}
          src={src}
          alt={frame ? '' : `${name}的封面`}
          referrerPolicy="no-referrer"
          onLoad={frame ? undefined : () => setStatus('ready')}
          onError={() => setStatus('error')}
        />
      )}
      {!frame && status !== 'ready' && (
        <div className={styles.coverState}>
          {status === 'loading' ? (
            <LoadingIndicator compact>正在加载封面…</LoadingIndicator>
          ) : (
            <span role="status">封面暂时无法显示</span>
          )}
        </div>
      )}
    </>
  );
}
