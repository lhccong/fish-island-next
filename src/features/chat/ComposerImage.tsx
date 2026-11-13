import { useState } from 'react';
import { useStore } from 'zustand';
import { X } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { useChatRealtime } from './realtime-context';
import styles from './ComposerImage.module.css';

export function ComposerImage() {
  const { imageUpload, composerRef } = useChatRealtime();
  const state = useStore(imageUpload.store, (state) => state);
  const [failedUrl, setFailedUrl] = useState('');
  if (state.status === 'empty') return null;
  return (
    <div
      className={styles.attachment}
      data-ready={state.status === 'ready' && failedUrl !== state.url}
      aria-label="待发送图片"
      role="region"
    >
      {state.status === 'ready' && failedUrl !== state.url && (
        <img src={state.url} alt="待发送图片预览" onError={() => setFailedUrl(state.url)} />
      )}
      {(state.status !== 'ready' || failedUrl === state.url) && (
        <span role="status" data-tone={state.status === 'error' ? 'error' : 'info'}>
          {state.status === 'uploading'
            ? '图片上传中…'
            : state.status === 'error'
              ? state.error
              : failedUrl === state.url
                ? '图片预览加载失败'
                : ''}
        </span>
      )}
      <div className={styles.controls}>
        {state.status === 'error' && (
          <Button variant="secondary" onClick={imageUpload.retry}>
            重试上传
          </Button>
        )}
        <button
          type="button"
          className={styles.remove}
          aria-label="移除图片"
          title="移除图片"
          onClick={() => {
            imageUpload.clear();
            composerRef.current?.focus({ preventScroll: true });
          }}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
