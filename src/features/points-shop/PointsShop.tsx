import { useState, type ReactNode } from 'react';
import type { PointsShopPort } from '@/domain/points-shop';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { ShopItems } from './ShopItems';
import { ShopList } from './ShopList';
import styles from './Shop.module.css';

const tabs = ['头像框', '其他物品', '积分记录', '相关介绍'] as const;
export function PointsShop({
  service,
  points,
  usedPoints,
  frames,
  support,
  onPurchased,
}: {
  service: PointsShopPort;
  points: number | undefined;
  usedPoints: number | undefined;
  frames: ReactNode;
  support: ReactNode;
  onPurchased: (signal: AbortSignal) => Promise<void>;
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]>('头像框');
  const [itemsVisited, setItemsVisited] = useState(false);
  const available =
    points === undefined || usedPoints === undefined ? null : Math.max(0, points - usedPoints);
  return (
    <section className={styles.shop} aria-label="积分商城">
      <div className={styles.summary}>
        <div>
          <span>可用积分</span>
          <strong>{available === null ? '待同步' : available.toLocaleString()}</strong>
        </div>
        <p>
          累计 {points?.toLocaleString() ?? '—'} · 已用 {usedPoints?.toLocaleString() ?? '—'}
        </p>
      </div>
      <nav className={styles.tabs} aria-label="商城分类">
        {tabs.map((name) => (
          <button
            key={name}
            type="button"
            aria-current={tab === name ? 'page' : undefined}
            onClick={() => {
              if (name === '其他物品') setItemsVisited(true);
              setTab(name);
            }}
          >
            {name}
          </button>
        ))}
      </nav>
      <div className={styles.panel} hidden={tab !== '头像框'}>
        {frames}
      </div>
      {itemsVisited && (
        <div className={styles.panel} hidden={tab !== '其他物品'}>
          <ShopItems service={service} available={available} onPurchased={onPurchased} />
        </div>
      )}
      {tab === '积分记录' && (
        <ShopList
          load={service.records}
          label="积分记录"
          empty="暂无积分记录"
          render={(items) => (
            <div className={styles.records}>
              {items.map((item) => (
                <article key={item.id} className={styles.record}>
                  <div>
                    <h2>{item.description}</h2>
                    <p>
                      {formatTime(item.createdAt)} · 可用 {item.available.toLocaleString()}
                    </p>
                  </div>
                  <strong data-gain={item.change > 0}>
                    {item.change > 0 ? '+' : ''}
                    {item.change.toLocaleString()}
                  </strong>
                </article>
              ))}
            </div>
          )}
        />
      )}
      {tab === '相关介绍' && (
        <ScrollArea label="商城介绍" gutter="reserved" className={styles.scroll ?? ''}>
          <div className={styles.body}>
            <h2>摸鱼会员月卡</h2>
            <p>
              使用积分兑换月卡，增加一个月会员时间；已有有效月卡时，在到期时间上顺延。永久会员无需兑换月卡。
            </p>
            <h2>头像框</h2>
            <p>兑换后可在头像框分类中使用，也可随时选择不使用头像框。</p>
            <h2>支持摸鱼岛</h2>
            <p>会员权益与支持方式请查看支持页面。</p>
            {support}
          </div>
        </ScrollArea>
      )}
    </section>
  );
}
function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '时间未知'
    : date.toLocaleString('zh-CN', { hour12: false });
}
