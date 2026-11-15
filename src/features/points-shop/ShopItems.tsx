import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useEffect, useRef, useState } from 'react';
import type { PointsShopPort, ShopItem } from '@/domain/points-shop';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { ShopList } from './ShopList';
import styles from './Shop.module.css';

export function ShopItems({
  service,
  available,
  onPurchased,
}: {
  service: PointsShopPort;
  available: number | null;
  onPurchased: (signal: AbortSignal) => Promise<void>;
}) {
  const [selected, setSelected] = useState<ShopItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [balanceError, setBalanceError] = useState(false);
  const operation = useRef<AbortController | null>(null);
  useEffect(() => () => operation.current?.abort(), []);
  async function refreshBalance(signal: AbortSignal) {
    try {
      await onPurchased(signal);
      if (!signal.aborted) setBalanceError(false);
    } catch {
      if (!signal.aborted) setBalanceError(true);
    }
  }
  async function purchase() {
    if (!selected || operation.current || available === null || available < selected.points) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await service.purchase(selected.id, controller.signal);
      if (controller.signal.aborted) return;
      setSuccess(`已兑换「${selected.name}」`);
      setSelected(null);
      await refreshBalance(controller.signal);
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '兑换失败，请重试');
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <>
      <ShopList
        load={service.items}
        label="道具"
        empty="暂无可兑换的道具"
        render={(items) => (
          <div className={styles.grid}>
            {items.map((item) => (
              <article key={item.id} className={styles.card}>
                <div className={styles.product}>
                  <ItemImage item={item} />
                  <div className={styles.details}>
                    <h2>{item.name}</h2>
                    <p>{item.description}</p>
                  </div>
                </div>
                <div className={styles.purchase}>
                  <strong>
                    {item.points.toLocaleString()} <span>积分</span>
                  </strong>
                  <Button
                    disabled={
                      busy ||
                      balanceError ||
                      available === null ||
                      !item.supported ||
                      available < item.points
                    }
                    onClick={() => {
                      setSelected(item);
                      setError('');
                      setSuccess('');
                    }}
                  >
                    {!item.supported
                      ? '暂不支持兑换'
                      : available === null
                        ? '积分未同步'
                        : available < item.points
                          ? '积分不足'
                          : '立即兑换'}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      />
      <div className={styles.feedback}>
        {success && <p role="status">{success}</p>}
        {balanceError && (
          <div role="alert">
            <p>兑换已成功，积分同步失败，请先重新读取，勿重复兑换。</p>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                const controller = new AbortController();
                operation.current = controller;
                setBusy(true);
                void refreshBalance(controller.signal).finally(() => {
                  operation.current = null;
                  if (!controller.signal.aborted) setBusy(false);
                });
              }}
            >
              同步积分
            </Button>
          </div>
        )}
      </div>
      {selected && (
        <Dialog
          open
          title="确认兑换道具"
          description={`兑换「${selected.name}」将消耗 ${selected.points} 积分，兑换后不可退还。`}
          showCloseAction={false}
          onOpenChange={(open) => {
            if (!open && !busy) setSelected(null);
          }}
        >
          {error && <p role="alert">{error}</p>}
          <div className={styles.actions}>
            <Button variant="secondary" disabled={busy} onClick={() => setSelected(null)}>
              取消
            </Button>
            <Button
              disabled={busy || available === null || available < selected.points}
              onClick={() => void purchase()}
            >
              {busy ? <LoadingIndicator compact>{'兑换中…'}</LoadingIndicator> : '确认兑换'}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}

function ItemImage({ item }: { item: ShopItem }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.image}>
      {item.imageUrl && !failed ? (
        <img src={item.imageUrl} alt={item.name} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span>{failed ? '图片加载失败' : '暂无图片'}</span>
      )}
    </div>
  );
}
