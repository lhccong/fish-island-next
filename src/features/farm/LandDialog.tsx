import type { RefObject } from 'react';
import { isMature, remainingTime, watering, type FarmAction, type Land } from '@/domain/farm';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { PixelPlant } from './PixelPlant';
import styles from './Farm.module.css';
export function LandDialog({
  land,
  returnFocusRef,
  now,
  visiting,
  level,
  balance,
  busy,
  onClose,
  onPlant,
  onAction,
}: {
  land: Land;
  returnFocusRef: RefObject<HTMLElement | null>;
  now: number;
  visiting: boolean;
  level: number;
  balance: number;
  busy: boolean;
  onClose: () => void;
  onPlant: () => void;
  onAction: (action: FarmAction) => Promise<boolean>;
}) {
  const mature = isMature(land, now);
  const water = watering(land, now);
  const unlock =
    land.unlockCost !== null &&
    land.unlockLevel !== null &&
    level >= land.unlockLevel &&
    balance >= land.unlockCost;
  const action: FarmAction = land.locked
    ? 'unlock'
    : visiting
      ? 'steal'
      : mature
        ? 'harvest'
        : 'water';
  const allowed = visiting
    ? mature && land.canSteal
    : land.locked
      ? unlock
      : mature || water.allowed;
  return (
    <Dialog
      returnFocusRef={returnFocusRef}
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title={`${land.index} 号地 · ${land.locked ? '待开垦' : land.cropName || '空地'}`}
      description={visiting ? '好友的农场' : '我的田地'}
      showCloseAction={false}
      dismissLabel="关闭地块详情"
      className={styles.dialog ?? ''}
    >
      <ScrollArea label="地块详情" gutter="reserved" className={styles.dialogScroll ?? ''}>
        <div className={styles.landDetail}>
          <PixelPlant mature={mature} empty={land.locked || land.status === 0} />
          {land.locked ? (
            <>
              <p>
                {land.unlockCost === null
                  ? '暂未开放开垦，请等待后续开放。'
                  : `开垦需要 ${land.unlockCost} 积分 · 农场 Lv.${land.unlockLevel ?? '—'}`}
              </p>
              <p>
                当前 Lv.{level} · 可用 {balance} 积分，按顺序解锁。
              </p>
            </>
          ) : land.status === 0 ? (
            <p>{visiting ? '好友还没有播种。' : '种下一颗种子，收获一份小小的期待。'}</p>
          ) : (
            <>
              <p>{mature ? '作物已经成熟' : `距离成熟：${remainingTime(land.harvestTime, now)}`}</p>
              {!visiting && !mature && (
                <>
                  <p>
                    今日还可浇水 {water.remaining} 次
                    {water.wait > 0 ? ` · 冷却剩余 ${remainingTime(now + water.wait, now)}` : ''}
                  </p>
                  <p>每次浇水缩短剩余时间 2%，每株间隔 30 分钟，每天最多 10 次。</p>
                </>
              )}
              {visiting && (
                <p>{land.canSteal ? '可以偷菜，收益由农场服务结算。' : '这株作物当前不能偷菜。'}</p>
              )}
            </>
          )}
        </div>
      </ScrollArea>
      <div className={styles.actions}>
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          关闭
        </Button>
        {!visiting && !land.locked && land.status === 0 ? (
          <Button onClick={onPlant}>选择种子</Button>
        ) : (
          <Button
            disabled={busy || !allowed}
            onClick={async () => {
              if (await onAction(action)) onClose();
            }}
          >
            {busy
              ? '处理中…'
              : land.locked
                ? '确认开垦'
                : visiting
                  ? '偷菜'
                  : mature
                    ? '收获'
                    : '浇水'}
          </Button>
        )}
      </div>
    </Dialog>
  );
}
