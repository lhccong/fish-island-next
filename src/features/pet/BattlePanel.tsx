import { useCallback, useEffect, useState } from 'react';
import type { BattlePreview, BattleResult, BattleTarget, Companion, PetPort } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { usePetOperation, usePetResource } from './resource';
import { ResourceView, OperationNotice } from './Feedback';
import { BattleStage } from './BattleStage';
import styles from './Panels.module.css';

export function BattlePanel({
  service,
  pet,
  target,
  onChange,
}: {
  service: PetPort;
  pet: Companion;
  target: BattleTarget;
  onChange: () => void;
}) {
  const load = useCallback(
    async (signal: AbortSignal): Promise<BattlePreview> => {
      if (target.kind !== 'tower') return service.preview(target, signal);
      const progress = await service.tower(signal);
      if (!progress.next || progress.completed)
        throw new Error('当前没有可挑战的下一层，请返回列表刷新');
      return {
        self: { id: pet.id, name: pet.name, url: pet.url, health: 0, attack: 0, reward: 0 },
        opponent: progress.next,
      };
    },
    [service, pet.id, pet.name, pet.url, target],
  );
  const resource = usePetResource(load);
  return (
    <ResourceView state={resource.state} reload={resource.reload}>
      {(preview) => (
        <BattlePlayback service={service} target={target} preview={preview} onChange={onChange} />
      )}
    </ResourceView>
  );
}
function BattlePlayback({
  service,
  target,
  preview,
  onChange,
}: {
  service: PetPort;
  target: BattleTarget;
  preview: BattlePreview;
  onChange: () => void;
}) {
  const [result, setResult] = useState<BattleResult | null>(null);
  const [frame, setFrame] = useState(-1);
  const operation = usePetOperation();
  const playing = !!result && frame < result.rounds.length - 1;
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setFrame((value) => value + 1), 900);
    return () => clearTimeout(timer);
  }, [playing, frame]);
  const current = result?.rounds[frame];
  const done = !!result && !playing;
  const totalDamage =
    result?.rounds
      .filter((round) => round.attacker === 'self')
      .reduce((sum, round) => sum + round.damage, 0) ?? 0;
  const outcome =
    result?.win === true || current?.opponentHealth === 0
      ? '挑战胜利'
      : result?.win === false || current?.selfHealth === 0
        ? '本次未获胜'
        : '本轮挑战结束';
  return (
    <div className={styles.stack}>
      <BattleStage preview={preview} current={current} />
      <p className={styles.muted}>
        回合演出由服务端结算结果驱动。开始后可能消耗挑战次数；关闭面板不会撤销已提交的挑战。
      </p>
      <OperationNotice notice={operation.notice} />
      {!result && (
        <div className={styles.actions}>
          <Button
            disabled={operation.pending}
            onClick={() =>
              void operation.run(
                async (signal) => {
                  const value = await service.battle(target, signal);
                  if (!value.rounds.length)
                    throw new Error('服务端未返回战斗回合，请先刷新确认挑战状态，避免重复提交');
                  return value;
                },
                '服务端已结算，正在播放回合',
                (value) => {
                  setResult(value);
                  setFrame(0);
                  onChange();
                },
              )
            }
          >
            {operation.pending ? '正在提交挑战…' : '开始挑战'}
          </Button>
        </div>
      )}
      {playing && (
        <div className={styles.actions}>
          <span>
            回合 {frame + 1} / {result!.rounds.length}
          </span>
          <Button variant="secondary" onClick={() => setFrame(result!.rounds.length - 1)}>
            跳过演出
          </Button>
        </div>
      )}
      {done && (
        <div className={styles.card} role="status">
          <h3>{outcome}</h3>
          <p>
            本次累计伤害 {totalDamage}
            {result.reward !== undefined ? ` · 获得 ${result.reward} 积分` : ''}
          </p>
        </div>
      )}
      {result && (
        <ol className={styles.battleLog} aria-label="战斗回合记录">
          {result.rounds.slice(0, frame + 1).map((round, index) => (
            <li key={index}>
              第 {index + 1} 回合 ·{' '}
              {round.attacker === 'self' ? preview.self.name : preview.opponent.name}：
              {round.dodge
                ? '对手闪避'
                : `${round.critical ? '暴击 ' : round.block ? '格挡后 ' : ''}造成 ${round.damage} 伤害`}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
