import { useCallback, useState } from 'react';
import type { PetPort } from '@/domain/pet';
import { usePetResource } from './resource';
import { ResourceView } from './Feedback';
import { ConfirmAction } from './ConfirmAction';
import { PetRankRow } from './PetRankRow';
import rankingStyles from './Rankings.module.css';
import styles from './Panels.module.css';

export function TournamentPanel({
  service,
  userId,
  onChange,
}: {
  service: PetPort;
  userId: string;
  onChange: () => void;
}) {
  const load = useCallback((signal: AbortSignal) => service.tournament(signal), [service]);
  const resource = usePetResource(load);
  const [outcome, setOutcome] = useState('');
  return (
    <>
      <p className={styles.muted}>每日最多 10 次挑战，名次与剩余次数由服务端校验。</p>
      {outcome && (
        <div className={styles.notice} role="status">
          {outcome}
        </div>
      )}
      <ResourceView state={resource.state} reload={resource.reload}>
        {(data) => (
          <>
            <p>我的名次：{data.mine ?? '尚未上榜'}</p>
            {!data.ranks.length && <div className={styles.feedback}>今日暂无排位记录。</div>}
            <ol className={rankingStyles.list} hidden={!data.ranks.length}>
              {data.ranks.map((entry) => (
                <PetRankRow
                  key={entry.id}
                  rank={entry.rank}
                  name={entry.name}
                  owner={entry.owner}
                  avatar={entry.ownerAvatar}
                  petUrl={entry.url}
                  metric={`Lv.${entry.level}`}
                  mine={entry.userId === userId}
                >
                  <ConfirmAction
                    label="挑战排位"
                    disabled={entry.userId === userId}
                    description={`挑战第 ${entry.rank} 位将消耗每日挑战次数，是否继续？`}
                    action={async (signal) => {
                      const result = await service.compete(entry.rank, signal);
                      setOutcome(
                        `${result.win ? '挑战胜利' : '本次未获胜'} · 当前名次：${result.rank ?? '未上榜'}`,
                      );
                    }}
                    onSuccess={() => {
                      resource.reload();
                      onChange();
                    }}
                  />
                </PetRankRow>
              ))}
            </ol>
          </>
        )}
      </ResourceView>
    </>
  );
}
