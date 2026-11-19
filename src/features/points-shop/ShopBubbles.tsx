import { useState } from 'react';
import type { PointsShopPort, ShopBubble } from '@/domain/points-shop';
import { bubbleArtworkClass, bubbleArtworkProps } from '@/shared/ui/BubbleArtwork';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { PageFooterOutlet } from '@/shared/ui/PageFooter';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { useBubbleShop } from './use-bubble-shop';
import styles from './Shop.module.css';
import bubbleStyles from './ShopBubbles.module.css';

const expiryFormat = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  hour12: false,
});

export function ShopBubbles({
  service,
  available,
  onPurchased,
}: {
  service: PointsShopPort;
  available: number | null;
  onPurchased: (signal: AbortSignal) => Promise<void>;
}) {
  const shop = useBubbleShop(service, onPurchased);
  const [selected, setSelected] = useState<ShopBubble | null>(null);
  const busy = shop.pending !== null;
  const synchronized = available !== null && !shop.balanceError;

  function closeConfirmation() {
    if (busy) return;
    setSelected(null);
  }

  return (
    <>
      <ScrollArea label="聊天气泡" gutter="reserved" fillContent className={styles.scroll ?? ''}>
        {shop.catalog.status === 'loading' ? (
          <LoadingIndicator>正在加载聊天气泡…</LoadingIndicator>
        ) : (
          <div className={styles.body}>
            {shop.catalog.status === 'error' ? (
              <div role="alert">
                <p>{shop.catalog.message}</p>
                <Button variant="secondary" onClick={shop.reload}>
                  重新读取
                </Button>
              </div>
            ) : shop.catalog.items.length === 0 ? (
              <div>
                <p role="status">暂无可兑换的聊天气泡</p>
                <Button variant="secondary" onClick={shop.reload}>
                  重新读取
                </Button>
              </div>
            ) : (
              <div className={styles.grid}>
                {shop.catalog.items.map((item) => {
                  const active = item.expiresAt !== null && item.expiresAt > shop.now;
                  const equipped = active && item.equipped;
                  const enough = synchronized && available >= item.points;
                  const label = equipped
                    ? '恢复默认'
                    : active
                      ? '使用'
                      : !synchronized
                        ? '积分未同步'
                        : enough
                          ? '兑换'
                          : '积分不足';
                  return (
                    <article key={item.id} className={`${styles.card} ${bubbleStyles.card}`}>
                      <div className={bubbleStyles.preview} aria-hidden="true">
                        <span
                          className={`${bubbleStyles.sample} ${bubbleArtworkClass}`}
                          data-bubble-style={item.id}
                          {...bubbleArtworkProps(item.artwork)}
                        >
                          摸鱼一下
                        </span>
                      </div>
                      <div className={styles.details}>
                        <h2>{item.name}</h2>
                        {active && item.expiresAt !== null ? (
                          <p>
                            {equipped ? '使用中 · ' : '已兑换 · '}
                            有效至 {expiryFormat.format(item.expiresAt)}
                          </p>
                        ) : item.expiresAt !== null ? (
                          <p>已过期</p>
                        ) : null}
                      </div>
                      <div className={styles.purchase}>
                        <strong>
                          {item.points.toLocaleString()} <span>积分 · {item.durationDays} 天</span>
                        </strong>
                        <Button
                          variant={equipped || (!active && !enough) ? 'secondary' : 'primary'}
                          aria-label={`${label} ${item.name}`}
                          disabled={busy || (!active && !enough)}
                          onClick={() => {
                            if (active)
                              void shop.run({ kind: 'equip', id: equipped ? null : item.id });
                            else {
                              shop.setError('');
                              setSelected(item);
                            }
                          }}
                        >
                          {label}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {shop.catalog.status !== 'loading' && <PageFooterOutlet />}
      </ScrollArea>
      <div className={styles.feedback}>
        {shop.pending === 'equip' && <LoadingIndicator compact>正在切换气泡…</LoadingIndicator>}
        {shop.notice && <p role="status">{shop.notice}</p>}
        {!selected && shop.error && (
          <div role="alert">
            <p>{shop.error}</p>
            <Button variant="secondary" onClick={shop.reload}>
              重新读取
            </Button>
          </div>
        )}
        {shop.balanceError && (
          <div role="alert">
            <p>兑换已成功，积分同步失败。</p>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void shop.run({ kind: 'balance' })}
            >
              {shop.pending === 'balance' ? (
                <LoadingIndicator compact>同步中…</LoadingIndicator>
              ) : (
                '同步积分'
              )}
            </Button>
          </div>
        )}
      </div>
      {selected && (
        <Dialog
          open
          title="兑换聊天气泡"
          description={`兑换「${selected.name}」需要 ${selected.points} 积分，自兑换成功起有效 ${selected.durationDays} 天。`}
          showCloseAction={false}
          onOpenChange={(open) => {
            if (!open) closeConfirmation();
          }}
        >
          {shop.error && <p role="alert">{shop.error}</p>}
          <div className={styles.actions}>
            <Button variant="secondary" disabled={busy} onClick={closeConfirmation}>
              取消
            </Button>
            <Button
              disabled={busy || !synchronized || available < selected.points}
              onClick={() => {
                void shop.run({ kind: 'exchange', item: selected }).then((ok) => {
                  if (ok) setSelected(null);
                });
              }}
            >
              {shop.pending === 'exchange' ? (
                <LoadingIndicator compact>兑换中…</LoadingIndicator>
              ) : (
                '确认兑换'
              )}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
