import { useEffect, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import styles from './MilkyWayIdle.module.css';

const gameUrl = 'https://www.milkywayidle.com/#';
const loadTimeout = 15_000;

function GameFrame({ onRetry }: { onRetry: () => void }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    if (status !== 'loading') return;
    const timer = window.setTimeout(() => setStatus('error'), loadTimeout);
    return () => window.clearTimeout(timer);
  }, [status]);

  return (
    <div className={styles.game}>
      {status !== 'error' && (
        <iframe
          className={styles.frame}
          data-loading={status === 'loading'}
          title="奶牛放置"
          src={gameUrl}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      )}
      {status === 'loading' && <LoadingIndicator>正在打开奶牛放置…</LoadingIndicator>}
      {status === 'error' && (
        <div className={styles.error}>
          <p role="alert">奶牛放置加载失败，请重试。</p>
          <Button onClick={onRetry}>重试</Button>
        </div>
      )}
    </div>
  );
}

export function MilkyWayIdle() {
  const [attempt, setAttempt] = useState(0);

  return <GameFrame key={attempt} onRetry={() => setAttempt((value) => value + 1)} />;
}
