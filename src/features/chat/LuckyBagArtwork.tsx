import { useState } from 'react';
import { Gift } from 'lucide-react';
import styles from './LuckyBag.module.css';

export function LuckyBagArtwork({
  size,
  decorative = false,
}: {
  size: 48 | 64;
  decorative?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span
      className={styles.artwork}
      style={{ width: size, height: size }}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : '福袋'}
    >
      <Gift size={32} aria-hidden="true" />
    </span>
  ) : (
    <img
      src="https://oss.cqbo.com/moyu/fudai.jpg"
      alt={decorative ? '' : '福袋'}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
