import { useState, type CSSProperties } from 'react';
import { PawPrint } from 'lucide-react';
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
  action?: 'idle' | 'run' | 'run-left' | 'pat';
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
  action: 'idle' | 'run' | 'run-left' | 'pat';
}) {
  const [failed, setFailed] = useState(false);
  const sprite = /\/moyu\/pet\/[^/?]+\.webp(?:\?|$)/i.test(url);
  const running = action === 'run' || action === 'run-left';
  const frames = running ? 8 : action === 'pat' ? 4 : 6;
  const row = action === 'run-left' ? 2 : action === 'run' ? 1 : action === 'pat' ? 3 : 0;
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
      className={sprite ? styles.sprite : styles.static}
      data-action={action}
      style={style}
      role="img"
      aria-label={name}
    >
      <img src={url} alt="" onError={() => setFailed(true)} draggable={false} />
    </span>
  );
}
