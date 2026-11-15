import { useCallback, useRef, useState } from 'react';
import type { PetPort, SupplyPrize } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { usePetOperation, usePetResource } from './resource';
import { ResourceView, OperationNotice } from './Feedback';
import { PanelDialog } from './PanelDialog';
import { ItemIcon } from './ItemIcon';
import { LotteryRecords } from './LotteryRecords';
import { animateLottery } from './lottery-animation';
import styles from './Lottery.module.css';

export function LotteryDetail({
  id,
  service,
  onChange,
  onBusy,
  free,
}: {
  id: string;
  service: PetPort;
  onChange: (signal: AbortSignal) => Promise<void>;
  onBusy: (busy: boolean) => void;
  free: boolean;
}) {
  const load = useCallback((signal: AbortSignal) => service.supply(id, signal), [service, id]);
  const resource = usePetResource(load);
  const operation = usePetOperation();
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState<{ cost: number; prizes: SupplyPrize[] } | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [revision, setRevision] = useState(0);
  const resultsFocus = useRef<HTMLButtonElement | null>(null);
  return (
    <ResourceView state={resource.state} reload={resource.reload}>
      {(supply) => {
        const draw = (count: 1 | 10) =>
          void operation.run(async (signal) => {
            onBusy(true);
            setActive(-1);
            try {
              const drawn = await service.draw(id, count, signal);
              const last = drawn.prizes.at(-1);
              const target = last
                ? supply.prizes.slice(0, 9).findIndex((p) => p.prizeKey === last.prizeKey)
                : -1;
              if (target >= 0) await animateLottery(target, signal, setActive);
              signal.throwIfAborted();
              setResult(drawn);
              setShowResults(count === 10);
              setRevision((n) => n + 1);
              await onChange(signal);
              resource.accept(await service.supply(id, signal));
            } finally {
              onBusy(false);
            }
          }, '抽奖已结算');
        return (
          <div className={styles.layout}>
            <section className={styles.main} aria-label="九宫格转盘">
              <div className={styles.machine}>
                <div className={styles.grid}>
                  {Array.from({ length: 9 }, (_, index) => {
                    const prize = supply.prizes[index];
                    return (
                      <article
                        key={prize?.id ?? `empty-${index}`}
                        className={styles.prize}
                        data-active={index === active}
                        data-quality={prize?.qualityLevel ?? 0}
                      >
                        {prize ? (
                          <>
                            <ItemIcon url={prize.icon} name={prize.name} />
                            <strong>{prize.name}</strong>
                            <small>{prize.quality}</small>
                          </>
                        ) : (
                          <span className={styles.placeholder}>暂无奖品</span>
                        )}
                      </article>
                    );
                  })}
                </div>
                <div className={styles.actions}>
                  <Button
                    disabled={operation.pending || !supply.prizes.length}
                    onClick={() => draw(1)}
                  >
                    单抽 · {free ? '免费' : `${supply.cost} 积分`}
                  </Button>
                  <Button
                    disabled={operation.pending || !supply.prizes.length}
                    onClick={() => draw(10)}
                  >
                    十连抽 · {supply.cost * (free ? 9 : 10)} 积分
                  </Button>
                </div>
              </div>
              {operation.pending && <LoadingIndicator compact>转盘抽奖中…</LoadingIndicator>}
              {supply.guarantee > 0 && (
                <div className={styles.guarantee}>
                  <div>
                    <span>保底进度</span>
                    <strong>
                      {supply.progress?.total ?? 0}/{supply.guarantee}
                    </strong>
                  </div>
                  <progress
                    aria-label="保底进度"
                    max={supply.guarantee}
                    value={Math.min(supply.progress?.total ?? 0, supply.guarantee)}
                  />
                  <small>抽奖 {supply.guarantee} 次必出传说奖励</small>
                </div>
              )}
              <OperationNotice notice={operation.notice} />
              {result && (
                <section className={styles.result} aria-label="本次抽奖结果">
                  <h3>本次抽奖 · 消耗 {result.cost} 积分</h3>
                  <p>
                    {result.prizes.map((p) => p.name).join('、') || '未返回奖品，请查看中奖记录'}
                  </p>
                  {result.prizes
                    .filter((p) => p.convertedPoints !== null)
                    .map((p, i) => (
                      <p key={`${p.id}:${i}`}>
                        {p.name}已折算为 {p.convertedPoints} 积分
                      </p>
                    ))}
                  {result.prizes.length > 1 && (
                    <Button
                      ref={resultsFocus}
                      variant="secondary"
                      onClick={() => setShowResults(true)}
                    >
                      查看十连抽结果
                    </Button>
                  )}
                </section>
              )}
            </section>
            <LotteryRecords key={revision} service={service} id={id} />
            {showResults && result && (
              <PanelDialog
                title="十连抽结果"
                description={`本次消耗 ${result.cost} 积分`}
                appearance="pixel"
                returnFocusRef={resultsFocus}
                onClose={() => setShowResults(false)}
              >
                <div className={styles.results}>
                  {result.prizes.map((p, i) => (
                    <article
                      key={`${p.id}:${i}`}
                      className={styles.prize}
                      data-quality={p.qualityLevel}
                    >
                      <ItemIcon url={p.icon} name={p.name} />
                      <strong>{p.name}</strong>
                      <small>{p.quality}</small>
                      {p.convertedPoints !== null && <small>折算 {p.convertedPoints} 积分</small>}
                    </article>
                  ))}
                </div>
              </PanelDialog>
            )}
          </div>
        );
      }}
    </ResourceView>
  );
}
