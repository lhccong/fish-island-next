import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { activatePwaUpdate, getPwaUpdate, subscribePwaUpdate } from './registration';
import styles from './PwaUpdateNotice.module.css';

type RefreshAttempt = { worker: ServiceWorker; state: 'refreshing' | 'failed' };

export function PwaUpdateNotice() {
  const update = useSyncExternalStore(subscribePwaUpdate, getPwaUpdate);
  const [dismissed, setDismissed] = useState<ServiceWorker | null>(null);
  const [attempt, setAttempt] = useState<RefreshAttempt | null>(null);
  if (!update || update === dismissed) return null;

  const refreshing = attempt?.state === 'refreshing';
  const failed = attempt?.worker === update && attempt.state === 'failed';

  async function refresh(worker: ServiceWorker) {
    setAttempt({ worker, state: 'refreshing' });
    try {
      await activatePwaUpdate(worker);
    } catch {
      setAttempt({ worker, state: 'failed' });
      return;
    }
    window.location.reload();
  }

  return createPortal(
    <section className={styles.notice} aria-label="网站更新">
      <div role="status">
        <h2 className={styles.title}>鱼岛有新版本</h2>
        <p className={styles.description}>刷新后即可使用新版，请先保存未提交的内容。</p>
      </div>
      {failed && (
        <p className={styles.error} role="alert">
          更新未完成，请重试。
        </p>
      )}
      <div className={styles.actions}>
        <Button variant="secondary" disabled={refreshing} onClick={() => setDismissed(update)}>
          稍后
        </Button>
        <Button
          aria-label={refreshing ? '正在更新…' : undefined}
          disabled={refreshing}
          onClick={() => void refresh(update)}
        >
          {refreshing ? (
            <LoadingIndicator compact>正在更新…</LoadingIndicator>
          ) : failed ? (
            '重试更新'
          ) : (
            '刷新更新'
          )}
        </Button>
      </div>
    </section>,
    document.body,
  );
}
