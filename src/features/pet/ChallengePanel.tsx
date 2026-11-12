import { useCallback, useState } from 'react';
import type { BattleTarget, Companion, PetPort } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { usePetResource } from './resource';
import { ResourceView } from './Feedback';
import { PetSprite } from './PetSprite';
import { BattlePanel } from './BattlePanel';
import { TournamentPanel } from './TournamentPanel';
import { OtherCompanionPanel } from './OtherCompanionPanel';
import { BossRanks } from './BossRanks';
import styles from './Panels.module.css';

export function ChallengePanel({
  service,
  pet,
  userId,
  onChange,
}: {
  service: PetPort;
  pet: Companion;
  userId: string;
  onChange: () => void;
}) {
  const [mode, setMode] = useState('rank');
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
      {mode === 'tower' && <TowerCard service={service} onSelect={setTarget} />}
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
          <div className={styles.stack}>
            {ranks.map((rank) => (
              <article key={rank.id} className={styles.rankRow}>
                <span className={styles.rank}>{rank.rank}</span>
                <PetSprite url={rank.url} name={rank.name} size={44} />
                <div>
                  <strong>{rank.name}</strong>
                  <small>
                    {rank.owner} · Lv.{rank.level}
                  </small>
                </div>
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
              </article>
            ))}
          </div>
          {other && (
            <OtherCompanionPanel service={service} userId={other} onClose={() => setOther(null)} />
          )}
        </>
      )}
    </ResourceView>
  );
}
function BossList({
  service,
  onSelect,
}: {
  service: PetPort;
  onSelect: (target: BattleTarget) => void;
}) {
  const load = useCallback((signal: AbortSignal) => service.bosses(signal), [service]);
  const resource = usePetResource(load);
  const [ranking, setRanking] = useState<string | null>(null);
  return (
    <ResourceView state={resource.state} reload={resource.reload}>
      {(bosses) => (
        <>
          <p className={styles.muted}>首领挑战为服务端回合战，每日次数及奖励由服务端校验。</p>
          {!bosses.length && (
            <div className={styles.feedback}>暂无可挑战的首领，稍后再来看看。</div>
          )}
          <div className={styles.grid}>
            {bosses.map((boss) => (
              <article className={styles.card} key={boss.id}>
                <div className={styles.skinPreview}>
                  <PetSprite url={boss.url} name={boss.name} size={84} />
                </div>
                <strong>{boss.name}</strong>
                <p>
                  生命 {boss.health} · 攻击 {boss.attack}
                </p>
                <p>奖励说明：{boss.reward} 积分，以结算为准</p>
                <div className={styles.actions}>
                  <Button
                    disabled={boss.health <= 0}
                    onClick={() => onSelect({ kind: 'boss', id: boss.id })}
                  >
                    查看挑战
                  </Button>
                  <Button variant="secondary" onClick={() => setRanking(boss.id)}>
                    贡献排行
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {ranking && (
            <BossRanks service={service} bossId={ranking} onClose={() => setRanking(null)} />
          )}
        </>
      )}
    </ResourceView>
  );
}
function TowerCard({
  service,
  onSelect,
}: {
  service: PetPort;
  onSelect: (target: BattleTarget) => void;
}) {
  const load = useCallback((signal: AbortSignal) => service.tower(signal), [service]);
  const resource = usePetResource(load);
  return (
    <ResourceView state={resource.state} reload={resource.reload}>
      {(tower) => (
        <section className={styles.section}>
          <h3 data-tone="violet">逐层试炼</h3>
          <div className={styles.card}>
            <p>历史最高通关：{tower.floor} 层</p>
            {tower.completed ? (
              <p>已完成当前开放的全部试炼。</p>
            ) : tower.next ? (
              <>
                <PetSprite url={tower.next.url} name={tower.next.name} size={80} />
                <h4>下一位对手：{tower.next.name}</h4>
                <p>
                  生命 {tower.next.health} · 攻击 {tower.next.attack}
                </p>
                <Button onClick={() => onSelect({ kind: 'tower' })}>查看试炼</Button>
              </>
            ) : (
              <p>暂未返回下一层信息，请稍后重试。</p>
            )}
          </div>
        </section>
      )}
    </ResourceView>
  );
}
