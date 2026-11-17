import type { ReactNode } from 'react';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import styles from './MediaDisc.module.css';

export function MediaDisc({
  size = 'message',
  loading = false,
  children,
}: {
  size?: 'message' | 'compact';
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <span className={styles.disc} data-size={size} data-media-disc>
      <span className={styles.grooves} aria-hidden="true" />
      <span className={styles.hole} aria-hidden="true" />
      {loading ? (
        <span className={styles.loading}>
          <LoadingIndicator compact>加载中</LoadingIndicator>
        </span>
      ) : (
        children && (
          <span className={styles.badge} aria-hidden="true">
            {children}
          </span>
        )
      )}
    </span>
  );
}
