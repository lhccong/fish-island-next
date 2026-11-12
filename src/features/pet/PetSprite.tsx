import { useState, type CSSProperties } from 'react';
import { PawPrint } from 'lucide-react';
import { petSpriteAction, type PetSpriteAction } from './pet-sprite-actions';
import styles from './PetSprite.module.css';

export function PetSprite({
  url,
  name,
  size = 96,
  action = 'idle',
}: {
  url: string;
  name: string;
  size?: number;
  action?: PetSpriteAction;
}) {
  return <SpriteImage key={url} url={url} name={name} size={size} action={action} />;
}
function SpriteImage({
  url,
  name,
  size,
  action,
}: {
  url: string;
  name: string;
  size: number;
  action: PetSpriteAction;
}) {
  const [failed, setFailed] = useState(false);
  const [layout, setLayout] = useState<'loading' | 'sheet' | 'static'>('loading');
  const { row, frames } = petSpriteAction(url, action);
  const style = {
    '--sprite-size': `${size}px`,
    '--sprite-height': `${(size * 208) / 192}px`,
    '--sprite-end': `${-frames * size}px`,
    '--sprite-row': `${(-row * size * 208) / 192}px`,
    '--sprite-frames': frames,
  } as CSSProperties;
  if (!url || failed)
    return (
      <span
        className={styles.placeholder}
        style={style}
        role="img"
        aria-label={url ? `${name}的图片暂不可用` : `${name}暂无图片`}
      >
        <PawPrint size={Math.min(size / 2, 48)} />
      </span>
    );
  return (
    <span
      className={
        layout === 'sheet' ? styles.sprite : layout === 'loading' ? styles.loading : styles.static
      }
      data-action={action}
      data-layout={layout}
      style={style}
      role="img"
      aria-label={name}
    >
      {layout === 'loading' && <PawPrint size={Math.min(size / 2, 48)} aria-hidden="true" />}
      <img
        src={url}
        alt=""
        onLoad={(event) => {
          const image = event.currentTarget;
          setLayout(
            image.naturalWidth === 1536 && image.naturalHeight === 1872 ? 'sheet' : 'static',
          );
        }}
        onError={() => setFailed(true)}
        draggable={false}
      />
    </span>
  );
}
