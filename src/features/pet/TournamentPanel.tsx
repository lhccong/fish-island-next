import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useCallback, useRef, useState } from 'react';
import type { BattlePreview, PetPort, PetRank } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { usePetOperation, usePetResource } from './resource';
import { OperationNotice, ResourceView } from './Feedback';
import { RankAvatar } from './RankAvatar';
import { OtherCompanionPanel } from './OtherCompanionPanel';
import { TournamentBattle } from './TournamentBattle';
import styles from './Tournament.module.css';

export function TournamentPanel({
  service,
  userId,
  onChange,
}: {
  service: PetPort;
  userId: string;
  onChange: () => void;
}) {
  const [uncertain, setUncertain] = useState(false);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const data = await service.tournament(signal);
      if (!signal.aborted) setUncertain(false);
      return data;
    },
    [service],
  );
  const resource = usePetResource(load);
  const operation = usePetOperation();
  const [pendingRank, setPendingRank] = useState<number | null>(null);
  const [battleOpen, setBattleOpen] = useState(false);
  const [preview, setPreview] = useState<BattlePreview | null>(null);
  const [settlement, setSettlement] = useState<{
    target: { rank: number; entry?: PetRank };
    result: Awaited<ReturnType<PetPort['compete']>>;
  } | null>(null);
  const [other, setOther] = useState<string | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const refreshButton = useRef<HTMLButtonElement | null>(null);
  function challenge(rank: number, entry?: PetRank) {
    setPendingRank(rank);
    setSettlement(null);
    setPreview(null);
    setBattleOpen(true);
    void operation.run(
      async (signal) => {
        if (entry) {
          const value = await service.preview({ kind: 'pet', id: entry.userId }, signal);
          if (signal.aborted) return null;
          setPreview(value);
        }
        try {
          return await service.compete(rank, signal);
        } catch (error) {
          if (
            !signal.aborted &&
            (error instanceof TypeError ||
              (error instanceof Error &&
                /连接|HTTP|timeout|格式|异常|数值|未知|Unexpected|JSON/i.test(error.message)))
          ) {
            setUncertain(true);
            throw new Error('未能确认挑战结果，请刷新榜单确认名次后再挑战。');
          }
          throw error;
        }
      },
      '结算成功',
      (result) => {
        if (!result) return;
        setSettlement({ target: { rank, ...(entry ? { entry } : {}) }, result });
        returnFocus.current = refreshButton.current;
        resource.reload();
        onChange();
      },
    );
  }
  return (
    <section className={styles.tournament} aria-label="武道大会">
      <header className={styles.heading}>
        <div>
          <h2>武道大会</h2>
          <p>与伙伴一起，向上挑战。</p>
        </div>
        <Button
          ref={refreshButton}
          variant="secondary"
          disabled={operation.pending || resource.state.status === 'loading'}
          onClick={resource.reload}
        >
          刷新榜单
        </Button>
      </header>
      <p className={styles.rule}>
        每日最多 10 次挑战，只能挑战更高名次；空位可直接入席。名次与次数以服务端结算为准。
      </p>
      {resource.data && resource.state.status === 'loading' && (
        <LoadingIndicator compact>正在刷新榜单…</LoadingIndicator>
      )}
      {resource.data && resource.state.status === 'error' && (
        <p role="alert">{resource.state.message}，请刷新榜单重试。</p>
      )}
      {uncertain && <p role="alert">上次挑战结果尚未确认，请刷新榜单后再挑战。</p>}
      <OperationNotice notice={operation.notice?.error ? operation.notice : null} />
      {(settlement || operation.pending) && (
        <Button
          variant="secondary"
          onClick={(event) => {
            returnFocus.current = event.currentTarget;
            setBattleOpen(true);
          }}
        >
          {operation.pending ? '查看进行中的挑战' : '查看战斗结果'}
        </Button>
      )}
      <ResourceView
        state={resource.data ? { status: 'ready', data: resource.data } : resource.state}
        reload={resource.reload}
      >
        {(data) => {
          const occupied = new Map(data.ranks.map((entry) => [entry.rank, entry]));
          const ranks = [
            ...new Set([...Array.from({ length: 10 }, (_, i) => i + 1), ...occupied.keys()]),
          ].sort((a, b) => a - b);
          return (
            <>
              <dl className={styles.stats}>
                <div>
                  <dt>我的排名</dt>
                  <dd>{data.mine ? `第 ${data.mine} 名` : '尚未上榜'}</dd>
                </div>
                <div>
                  <dt>今日参赛</dt>
                  <dd>{data.ranks.length} 人</dd>
                </div>
              </dl>
              {!data.ranks.length && <p role="status">今日暂无排位记录。</p>}
              <ol className={styles.list} aria-label="武道大会排名榜">
                {ranks.map((rank) => {
                  const entry = occupied.get(rank);
                  const mine = entry?.userId === userId || data.mine === rank;
                  return (
                    <li key={rank} className={styles.row} data-mine={mine}>
                      <span className={styles.rank}>#{rank}</span>
                      {entry ? (
                        <button
                          type="button"
                          className={styles.profile}
                          aria-label={`查看${entry.owner}的伙伴`}
                          onClick={(event) => {
                            returnFocus.current = event.currentTarget;
                            setOther(entry.userId);
                          }}
                        >
                          <RankAvatar
                            name={entry.owner}
                            avatar={entry.ownerAvatar}
                            petUrl={entry.url}
                            petName={entry.name}
                          />
                          <span className={styles.identity}>
                            <strong>
                              {entry.owner}
                              {mine ? '（我）' : ''}
                            </strong>
                            <span>
                              {entry.name} · Lv.{entry.level}
                            </span>
                          </span>
                        </button>
                      ) : (
                        <div className={styles.vacant}>
                          <strong>虚位以待</strong>
                          <span>带上伙伴，争夺此席</span>
                        </div>
                      )}
                      <Button
                        variant="secondary"
                        disabled={
                          uncertain ||
                          operation.pending ||
                          resource.state.status !== 'ready' ||
                          mine ||
                          (data.mine !== null && data.mine <= rank)
                        }
                        onClick={(event) => {
                          returnFocus.current = event.currentTarget;
                          challenge(rank, entry);
                        }}
                      >
                        {operation.pending && pendingRank === rank ? (
                          <LoadingIndicator compact>正在挑战…</LoadingIndicator>
                        ) : (
                          '挑战排位'
                        )}
                      </Button>
                    </li>
                  );
                })}
              </ol>
              <p className={styles.rule}>已全部加载 · {data.ranks.length} 位参赛者</p>
            </>
          );
        }}
      </ResourceView>
      {battleOpen && (
        <TournamentBattle
          preview={preview}
          settlement={settlement}
          pending={operation.pending}
          notice={operation.notice?.error ? operation.notice : null}
          onClose={() => setBattleOpen(false)}
          returnFocusRef={returnFocus}
        />
      )}
      {other && (
        <OtherCompanionPanel
          service={service}
          userId={other}
          viewerId={userId}
          onClose={() => setOther(null)}
          returnFocusRef={returnFocus}
        />
      )}
    </section>
  );
}
