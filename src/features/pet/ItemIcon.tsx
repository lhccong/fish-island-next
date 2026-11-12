import { useState } from 'react';
import { Package } from 'lucide-react';
import styles from './Panels.module.css';
export function ItemIcon({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={styles.itemIcon}>
      {url && !failed ? (
        <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <Package size={24} aria-hidden="true" />
      )}
    </span>
  );
}
