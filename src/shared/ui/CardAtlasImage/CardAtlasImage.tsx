import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { cardAtlasCrop } from './crop';
import styles from './CardAtlasImage.module.css';

export function CardAtlasImage({
  src,
  alt,
  tile,
  portrait,
  showFullTile = false,
  loadingLabel = '加载中',
  className = '',
}: {
  src: string | undefined;
  alt: string;
  tile: number;
  portrait: boolean;
  showFullTile?: boolean;
  loadingLabel?: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState('');
  const [failed, setFailed] = useState('');
  const fullPortrait = portrait && showFullTile;
  const crop = cardAtlasCrop(tile, portrait && !fullPortrait);
  return (
    <span className={`${styles.frame} ${className}`} data-full-portrait={fullPortrait || undefined}>
      {!src || failed === src ? (
        <span className={styles.unavailable}>
          <ImageOff size={15} aria-hidden="true" />
          缺图
        </span>
      ) : (
        <>
          {loaded !== src && <LoadingIndicator compact>{loadingLabel}</LoadingIndicator>}
          <img
            key={src}
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            data-loaded={loaded === src}
            style={{
              width: `${crop.width}%`,
              height: `${crop.height}%`,
              left: `${-crop.x}%`,
              top: `${-crop.y}%`,
            }}
            onLoad={() => setLoaded(src)}
            onError={() => setFailed(src)}
          />
        </>
      )}
    </span>
  );
}
