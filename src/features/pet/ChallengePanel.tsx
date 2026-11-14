import { useCallback, useState } from 'react';
import type { BattleTarget, Companion, PetPort } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { usePetResource } from './resource';
import { ResourceView } from './Feedback';
import { PetRankRow } from './PetRankRow';
import rankingStyles from './Rankings.module.css';
import { BattlePanel } from './BattlePanel';
import { TournamentPanel } from './TournamentPanel';
import { OtherCompanionPanel } from './OtherCompanionPanel';
import { BossList } from './BossList';
import { TowerCard } from './TowerCard';
import styles from './Panels.module.css';

export function ChallengePanel({
  service,
  pet,
  userId,
  onChange,
  initialMode = 'rank',
}: {
  service: PetPort;
  pet: Companion;
  userId: string;
  onChange: () => void;
  initialMode?: string;
}) {
  const [mode, setMode] = useState(initialMode);
  const [target, setTarget] = useState<BattleTarget | null>(null);
  if (target)
    return (
      <>
        <Button variant="secondary" onClick={() => setTarget(null)}>
          返回挑战列表
        </Button>
        <BattlePanel service={service} pet={pet} target={target} onChange={onChange} />
      </>
    );
  return (
    <>
      <Select
        appearance="pixel"
        label="挑战分类"
        value={mode}
        onValueChange={setMode}
        options={[
          { value: 'rank', label: '伙伴排行与切磋' },
          { value: 'boss', label: '首领挑战' },
          { value: 'tower', label: '逐层试炼' },
          { value: 'tournament', label: '每日排位' },
        ]}
      />
      {mode === 'rank' && <RankList service={service} userId={userId} onSelect={setTarget} />}
      {mode === 'boss' && <BossList service={service} onSelect={setTarget} />}
      {mode === 'tower' && <TowerCard service={service} userId={userId} onSelect={setTarget} />}
      {mode === 'tournament' && (
        <TournamentPanel service={service} userId={userId} onChange={onChange} />
      )}
    </>
  );
}
function RankList({
  service,
  userId,
  onSelect,
}: {
  service: PetPort;
  userId: string;
  onSelect: (target: BattleTarget) => void;
}) {
  const load = useCallback((signal: AbortSignal) => service.ranks(signal), [service]);
  const resource = usePetResource(load);
  const [other, setOther] = useState<string | null>(null);
  return (
    <ResourceView state={resource.state} reload={resource.reload}>
      {(ranks) => (
        <>
          {!ranks.length && (
            <div className={styles.feedback}>还没有伙伴上榜。照顾好伙伴，稍后再来看看。</div>
          )}
          <ol className={rankingStyles.list} hidden={!ranks.length}>
            {ranks.map((rank) => (
              <PetRankRow
                key={rank.id}
                rank={rank.rank}
                name={rank.name}
                owner={rank.owner}
                avatar={rank.ownerAvatar}
                petUrl={rank.url}
                metric={`Lv.${rank.level}`}
                mine={rank.userId === userId}
              >
                <Button variant="secondary" onClick={() => setOther(rank.userId)}>
                  资料
                </Button>
                <Button
                  variant="secondary"
                  disabled={rank.userId === userId}
                  onClick={() => onSelect({ kind: 'pet', id: rank.userId })}
                >
                  {rank.userId === userId ? '我的伙伴' : '切磋'}
                </Button>
              </PetRankRow>
            ))}
          </ol>
          {other && (
            <OtherCompanionPanel service={service} userId={other} onClose={() => setOther(null)} />
          )}
        </>
      )}
    </ResourceView>
  );
}
