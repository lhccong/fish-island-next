import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import styles from './Tools.module.css';
export function Feedback({
  busy,
  error,
  notice,
}: {
  busy: boolean;
  error: string;
  notice: string;
}) {
  return (
    <div className={styles.feedback} aria-live="polite">
      {busy && <LoadingIndicator compact>正在处理…</LoadingIndicator>}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
