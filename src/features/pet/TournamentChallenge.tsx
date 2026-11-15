import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useState, type RefObject } from 'react';
import type { PetPort, PetRank } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { PanelDialog } from './PanelDialog';
import { usePetOperation } from './resource';
import { OperationNotice } from './Feedback';
import { roundNarration } from './battle-presentation';
import styles from './Tournament.module.css';

type Result = Awaited<ReturnType<PetPort['compete']>>;
export function TournamentChallenge({
  service,
  target,
  onClose,
  onSettled,
  onUnknown,
  returnFocusRef,
}: {
  service: PetPort;
  target: { rank: number; entry?: PetRank };
  onClose: () => void;
  onSettled: () => void;
  onUnknown: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const operation = usePetOperation();
  const [result, setResult] = useState<Result | null>(null);
  const [uncertain, setUncertain] = useState(false);
  return (
    <PanelDialog
      title="挑战排位"
      description={`挑战第 ${target.rank} 位将消耗每日挑战次数。`}
      onClose={() => {
        if (!operation.pending) onClose();
      }}
      returnFocusRef={returnFocusRef}
    >
      <h3>
        第 {target.rank} 席 · {target.entry?.owner || '虚位以待'}
      </h3>
      {!result && (
        <p>
          {target.entry
            ? `对手伙伴：${target.entry.name} · Lv.${target.entry.level}`
            : '若结算时仍为空位，将直接入席，无需战斗。'}
        </p>
      )}
      <OperationNotice notice={operation.notice?.error ? operation.notice : null} />
      {result && (
        <>
          <div className={styles.result} role="status">
            <h3>{result.win ? '挑战胜利' : '本次未获胜'}</h3>
            <p>当前名次：{result.rank ?? '尚未上榜'}</p>
          </div>
          {result.rounds.length ? (
            <>
              <h3>战斗回合记录</h3>
              <ol className={styles.rounds}>
                {result.rounds.map((round, i) => (
                  <li key={i}>
                    第 {i + 1} 回合 ·{' '}
                    {roundNarration(round, '我的伙伴', target.entry?.name || '对手')}
                    <small>
                      我的生命 {round.selfHealth} · 对手生命 {round.opponentHealth}
                    </small>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p>本次结算未返回战斗回合，以服务端名次为准。</p>
          )}
        </>
      )}
      <div className={styles.actions}>
        <Button variant="secondary" disabled={operation.pending} onClick={onClose}>
          {result || uncertain ? '返回榜单' : '取消'}
        </Button>
        {!result && (
          <Button
            disabled={operation.pending || uncertain}
            onClick={() =>
              void operation.run(
                async (signal) => {
                  try {
                    return await service.compete(target.rank, signal);
                  } catch (error) {
                    if (
                      !signal.aborted &&
                      (error instanceof TypeError ||
                        (error instanceof Error &&
                          /连接|HTTP|timeout|格式|异常|数值|未知|Unexpected|JSON/i.test(
                            error.message,
                          )))
                    ) {
                      setUncertain(true);
                      onUnknown();
                      throw new Error('未能确认挑战结果，请返回榜单刷新名次后再挑战。');
                    }
                    throw error;
                  }
                },
                '结算成功',
                (value) => {
                  setResult(value);
                  onSettled();
                },
              )
            }
          >
            {operation.pending ? <LoadingIndicator compact>正在挑战…</LoadingIndicator> : '确认'}
          </Button>
        )}
      </div>
    </PanelDialog>
  );
}
