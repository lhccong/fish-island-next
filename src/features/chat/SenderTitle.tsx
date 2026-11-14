import { useState } from 'react';
import { senderTitle } from '@/domain/chat';
import { titleAsset } from './title-assets';
import styles from './SenderTitle.module.css';

function TitleImage({
  src,
  name,
  remote,
  width,
  height,
}: {
  src: string;
  name: string;
  remote: boolean;
  width: number;
  height: number;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={styles.badge}
      data-title-source={remote ? 'image' : 'svg'}
      title={name}
      style={{ width, height }}
    >
      {failed ? (
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
          onError={() => setFailed(true)}
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
            onError={() => setFailed(true)}
          />
        </svg>
      )}
    </span>
  );
}

export function SenderTitle({
  titleId,
  level,
}: {
  titleId: string | undefined;
  level: number | undefined;
}) {
  const asset = titleAsset(titleId, level);
  const name = senderTitle(titleId, level);
  if (!asset) return <span className={styles.unknown}>{name}</span>;
  return <TitleImage key={asset.src} {...asset} />;
}
