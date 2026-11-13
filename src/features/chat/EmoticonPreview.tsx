import { useState } from 'react';
import styles from './EmoticonPanel.module.css';

export function EmoticonPreview({ url }: { url: string }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  return (
    <div className={styles.previewImage}>
      {status !== 'error' && (
        <img
          src={url}
          alt="表情包放大图片"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
        />
      )}
      <span role="status">
        {status === 'loading'
          ? '预览加载中…'
          : status === 'error'
            ? '图片加载失败，请关闭后重试'
            : '表情包预览'}
      </span>
    </div>
  );
}
