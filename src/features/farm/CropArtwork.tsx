import { useState } from 'react';
import { PixelPlant } from './PixelPlant';
import styles from './Farm.module.css';
export function CropArtwork({ icon, mature }: { icon: string; mature: boolean }) {
  const [failed, setFailed] = useState('');
  if (!mature || !icon || failed === icon) return <PixelPlant mature={mature} />;
  if (/^https?:\/\//.test(icon) || /^\/(?!\/)/.test(icon)) {
    return (
      <img
        className={styles.cropArt}
        src={icon}
        alt=""
        loading="lazy"
        draggable={false}
        onError={() => setFailed(icon)}
      />
    );
  }
  return (
    <span className={styles.cropArt} aria-hidden="true">
      {icon}
    </span>
  );
}
