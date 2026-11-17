import { Coins, Shovel, Timer } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { treasureSites } from '@/domain/pet';
import type { useCampTreasure } from './use-camp-treasure';
import styles from './Treasure.module.css';

function countdown(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0')}:${Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
export function TreasureStatus({
  enabled,
  treasure: t,
}: {
  enabled: boolean;
  treasure: ReturnType<typeof useCampTreasure>;
}) {
  const data = t.data;
  const active = data?.active;
  const left = active ? Math.max(0, active.readyAt - t.now) : 0;
  const site = treasureSites.find((entry) => entry.id === active?.siteId);
  return (
    <section className={styles.status} aria-label="营地挖宝">
      <div className={styles.heading}>
        <strong>
          <Shovel size={16} aria-hidden="true" />
          挖宝
        </strong>
        {data && <span>今日 {data.used}/5 次</span>}
      </div>
      {!enabled ? (
        <p>领养伙伴后，可在草地上寻找宝藏。</p>
      ) : t.pending === 'load' || (!data && !t.error) ? (
        <LoadingIndicator compact>读取挖宝状态…</LoadingIndicator>
      ) : (
        <>
          {t.pending === 'start' ? (
            <LoadingIndicator compact>准备挖掘…</LoadingIndicator>
          ) : active ? (
            <div className={styles.progress}>
              {t.error ? (
                <p>挖掘记录已保留，重试后继续。</p>
              ) : (
                <LoadingIndicator compact>
                  {left > 0
                    ? `${site?.name ?? '营地'}挖掘中 · ${(left / 1000).toFixed(1)} 秒`
                    : '结算奖励…'}
                </LoadingIndicator>
              )}
              <progress aria-label="挖宝进度" max={5} value={5 - left / 1000} />
            </div>
          ) : data ? (
            <>
              {data.lastReward && (
                <p className={styles.reward} role="status" key={data.lastReward.id}>
                  <Coins size={18} aria-hidden="true" />
                  挖到 {data.lastReward.points} 积分，已到账！
                </p>
              )}
              <p className={styles.message}>
                {data.used >= 5 ? (
                  '今天已挖满 5 次，明天再来吧。'
                ) : t.now < data.nextAvailableAt ? (
                  <>
                    <Timer size={14} aria-hidden="true" />
                    距下次刷新 {countdown(data.nextAvailableAt - t.now)}
                  </>
                ) : (
                  '点击地图上的铲子，选择一处挖宝。'
                )}
              </p>
            </>
          ) : null}
          {t.error && (
            <div className={styles.error} role="alert">
              <span>{t.error}</span>
              <Button variant="secondary" onClick={t.retry}>
                重试挖宝状态
              </Button>
            </div>
          )}
          {t.balanceError && (
            <div className={styles.error} role="alert">
              <span>奖励已到账，积分余额刷新失败。</span>
              <Button variant="secondary" onClick={() => void t.syncBalance()}>
                刷新积分
              </Button>
            </div>
          )}
        </>
      )}
      <small>每次挖掘 5 秒 · 随机 1–10 积分 · 每小时刷新一次机会</small>
    </section>
  );
}
