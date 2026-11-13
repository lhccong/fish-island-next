import { useState, type RefObject } from 'react';
import { Dialog } from '@/shared/ui/Dialog';
import { Button } from '@/shared/ui/Button';
import styles from './ChatImagePreview.module.css';

export default function ChatImagePreview({
  url,
  onClose,
  returnFocusRef,
}: {
  url: string;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  return (
    <Dialog
      open
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
      title="图片预览"
      description="查看完整图片，按 Esc 或点击关闭返回聊天。"
      className={styles.dialog ?? ''}
      returnFocusRef={returnFocusRef}
      dismissLabel="关闭图片预览"
      showCloseAction={false}
    >
      <div className={styles.picture} data-preview-state={status}>
        {status !== 'error' && (
          <img
            key={attempt}
            src={url}
            alt="聊天图片大图"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setStatus('ready')}
            onError={() => setStatus('error')}
          />
        )}
        {status === 'loading' && (
          <span role="status" className={styles.status}>
            大图加载中…
          </span>
        )}
        {status === 'error' && (
          <div className={styles.status} role="alert">
            <span>图片加载失败</span>
            <Button
              variant="secondary"
              onClick={() => {
                setStatus('loading');
                setAttempt((n) => n + 1);
              }}
            >
              重试加载大图
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
