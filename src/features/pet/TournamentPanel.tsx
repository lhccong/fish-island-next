import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useCallback, useRef, useState } from 'react';
import type { PetPort, PetRank } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { usePetResource } from './resource';
import { ResourceView } from './Feedback';
import { RankAvatar } from './RankAvatar';
import { OtherCompanionPanel } from './OtherCompanionPanel';
import { TournamentChallenge } from './TournamentChallenge';
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
  const [target, setTarget] = useState<{ rank: number; entry?: PetRank } | null>(null);
  const [other, setOther] = useState<string | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const refreshButton = useRef<HTMLButtonElement | null>(null);
  return (
    <section className={styles.tournament} aria-label="武道大会">
      <header className={styles.heading}>
        <div>
          <h2>武道大会</h2>
          <p>与伙伴一起，向上挑战。</p>
        </div>
        <Button
          variant="secondary"
          disabled={resource.state.status === 'loading'}
          ref={refreshButton}
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
                          resource.state.status !== 'ready' ||
                          mine ||
                          (data.mine !== null && data.mine <= rank)
                        }
                        onClick={(event) => {
                          returnFocus.current = event.currentTarget;
                          setTarget({ rank, ...(entry ? { entry } : {}) });
                        }}
                      >
                        挑战排位
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
      {target && (
        <TournamentChallenge
          service={service}
          target={target}
          returnFocusRef={returnFocus}
          onUnknown={() => {
            returnFocus.current = refreshButton.current;
            setUncertain(true);
          }}
          onClose={() => setTarget(null)}
          onSettled={() => {
            returnFocus.current = refreshButton.current;
            resource.reload();
            onChange();
          }}
        />
      )}
      {other && (
        <OtherCompanionPanel
          service={service}
          userId={other}
          onClose={() => setOther(null)}
          returnFocusRef={returnFocus}
        />
      )}
    </section>
  );
}
