import { useState } from 'react';
import { Package } from 'lucide-react';
import { enhanceTier } from './enhance-tier';
import styles from './ItemIcon.module.css';
export function ItemIcon({
  url,
  name = '物品',
  level = 0,
  size = 'default',
}: {
  url: string;
  name?: string;
  level?: number;
  size?: 'default' | 'compact';
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const tier = enhanceTier(level);
  return (
    <span className={styles.itemIcon} data-enhance-tier={tier} data-size={size}>
      {url && failedUrl !== url ? (
        <img src={url} alt={name} loading="lazy" onError={() => setFailedUrl(url)} />
      ) : (
        <span role="img" aria-label={`${name}：${url ? '图片加载失败' : '暂无图片'}`}>
          <Package size={24} aria-hidden="true" />
        </span>
      )}
      {tier > 0 && (
        <span className={styles.badge} role="img" aria-label={`强化等级 +${level}`}>
          <span className={styles.badgeText} aria-hidden="true">
            +{level}
          </span>
        </span>
      )}
    </span>
  );
}
