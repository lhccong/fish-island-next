import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import styles from './LoadingIndicator.module.css';

export function LoadingIndicator({
  children = '加载中…',
  compact = false,
}: {
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <span
      className={`${styles.indicator} ${compact ? styles.compact : styles.region}`}
      role="status"
      aria-live="polite"
      data-loading-indicator={compact ? 'compact' : 'region'}
    >
      <LoaderCircle className={styles.icon} size={compact ? 16 : 24} aria-hidden="true" />
      <span className={styles.label}>{children}</span>
    </span>
  );
}
