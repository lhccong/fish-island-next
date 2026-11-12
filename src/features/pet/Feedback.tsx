import type { ReactNode } from 'react';
import { Button } from '@/shared/ui/Button';
import type { Resource } from './resource';
import styles from './Panels.module.css';

export function ResourceView<T>({
  state,
  reload,
  children,
}: {
  state: Resource<T>;
  reload: () => void;
  children: (data: T) => ReactNode;
}) {
  if (state.status === 'loading')
    return (
      <div className={styles.feedback} role="status">
        正在整理营地资料…
      </div>
    );
  if (state.status === 'error')
    return (
      <div className={styles.feedback} role="alert">
        <p>{state.message}</p>
        <Button variant="secondary" onClick={reload}>
          重试
        </Button>
      </div>
    );
  return children(state.data);
}
export function OperationNotice({
  notice,
}: {
  notice: { error: boolean; message: string } | null;
}) {
  return (
    notice && (
      <p
        className={notice.error ? styles.error : styles.notice}
        role={notice.error ? 'alert' : 'status'}
      >
        {notice.message}
      </p>
    )
  );
}
