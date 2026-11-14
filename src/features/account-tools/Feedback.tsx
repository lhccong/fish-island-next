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
      {busy && <p role="status">正在处理…</p>}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
