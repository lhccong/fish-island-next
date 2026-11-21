import { useState } from 'react';
import { senderTitle } from '@/domain/chat';
import { titleAsset } from './title-assets';
import styles from './SenderTitle.module.css';

function TitleImage({
  src,
  name,
  remote,
  personal,
  width,
  height,
  preview,
}: {
  src: string;
  name: string;
  remote: boolean;
  personal?: boolean;
  width: number;
  height: number;
  preview: boolean;
}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  return (
    <span
      className={styles.badge}
      data-title-source={remote ? 'image' : 'svg'}
      data-title-shine={
        personal && status === 'ready' ? (preview ? 'preview' : 'interactive') : undefined
      }
      title={name}
      style={{ width, height }}
    >
      {status === 'failed' ? (
        <span className={styles.fallback}>{name}</span>
      ) : remote ? (
        <img
          src={src}
          alt={name}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={personal ? () => setStatus('ready') : undefined}
          onError={() => setStatus('failed')}
        />
      ) : (
        <svg
          role="img"
          aria-label={name}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className={styles.artwork}
        >
          <image
            href={src}
            x={-12}
            y={-12}
            width={width + 24}
            height={height + 24}
            onError={() => setStatus('failed')}
          />
        </svg>
      )}
    </span>
  );
}

export function SenderTitle({
  titleId,
  level,
  preview = false,
}: {
  titleId: string | undefined;
  level: number | undefined;
  preview?: boolean;
}) {
  const asset = titleAsset(titleId, level);
  const name = senderTitle(titleId, level);
  if (!asset) return <span className={styles.unknown}>{name}</span>;
  return <TitleImage key={asset.src} {...asset} preview={preview} />;
}
