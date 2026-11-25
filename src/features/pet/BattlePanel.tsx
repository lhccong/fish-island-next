import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useCallback, useEffect, useState } from 'react';
import type { BattlePreview, BattleResult, BattleTarget, Companion, PetPort } from '@/domain/pet';
import { companionBattleHealth } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { usePetOperation, usePetResource } from './resource';
import { ResourceView, OperationNotice } from './Feedback';
import { BattleStage } from './BattleStage';
import { BattleRoundLog } from './BattleRoundLog';
import { battleFrameDuration, battleOutcome, roundNarration } from './battle-presentation';
import styles from './PixelBattle.module.css';

type BattleEncounter =
  { target: BattleTarget; pet: Companion } | { target: { kind: 'pet'; id: string }; pet?: never };

export function BattlePanel({
  service,
  pet,
  target,
  onChange,
}: BattleEncounter & { service: PetPort; onChange?: () => void }) {
  // Keep this encounter stable when the camp refreshes after server settlement.
  const [companion] = useState(pet);
  const load = useCallback(
    async (signal: AbortSignal): Promise<BattlePreview> => {
      if (target.kind !== 'tower') {
        const preview = await service.preview(target, signal);
        if (preview.self.equipment || !companion) return preview;
        return {
          ...preview,
          self: { ...preview.self, equipment: companion.equipment },
        };
      }
      if (!companion) throw new Error('请先领养伙伴再开始试炼');
      const progress = await service.tower(signal);
      if (!progress.next || progress.completed)
        throw new Error('当前没有可挑战的下一层，请返回列表查看最新进度');
      return {
        self: {
          id: companion.id,
          name: companion.name,
          url: companion.url,
          level: companion.level,
          health: companionBattleHealth(companion),
          attack: companion.stats.find(([name]) => name === '攻击')?.[1] ?? 0,
          reward: 0,
          equipment: companion.equipment,
        },
        opponent: progress.next,
      };
    },
    [service, companion, target],
  );
  const resource = usePetResource(load);
  return (
    <ResourceView state={resource.state} reload={resource.reload}>
      {(preview) => (
        <BattlePlayback
          service={service}
          target={target}
          preview={preview}
          onChange={onChange}
          onContinue={resource.reload}
        />
      )}
    </ResourceView>
  );
}
function BattlePlayback({
  service,
  target,
  preview,
  onChange,
  onContinue,
}: {
  service: PetPort;
  target: BattleTarget;
  preview: BattlePreview;
  onChange: (() => void) | undefined;
  onContinue: () => void;
}) {
  const [result, setResult] = useState<BattleResult | null>(null);
  const [frame, setFrame] = useState(0);
  const [uncertain, setUncertain] = useState(false);
  const operation = usePetOperation();
  const playing = !!result && frame < result.rounds.length;
  const current = result?.rounds[Math.min(frame, result.rounds.length - 1)];
  const roundCount = result?.rounds.at(-1)?.roundNumber ?? result?.rounds.length;
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setFrame((value) => value + 1), battleFrameDuration(current));
    return () => clearTimeout(timer);
  }, [playing, frame, current]);
  const done = !!result && !playing;
  const totalDamage =
    result?.rounds
      .filter((round) => round.attacker === 'self')
      .reduce((sum, round) => sum + round.damage, 0) ?? 0;
  const title =
    target.kind === 'tower' ? '逐层试炼' : target.kind === 'boss' ? '首领对战' : '伙伴切磋';
  return (
    <div className={styles.battle}>
      <header className={styles.battleHeader}>
        <h3>{title}</h3>
        <span>
          {playing
            ? `回合 ${current?.roundNumber ?? frame + 1} / ${roundCount}`
            : done
              ? '战斗结束'
              : '准备就绪'}
        </span>
      </header>
      <BattleStage
        preview={preview}
        current={current}
        frame={frame}
        playing={playing}
        tower={target.kind === 'tower'}
        duel={target.kind === 'pet'}
      />
      <div className={styles.console}>
        <p aria-live="polite">
          {operation.pending ? (
            <LoadingIndicator compact>{'伙伴已出发，正在等待战斗结果…'}</LoadingIndicator>
          ) : current ? (
            roundNarration(current, preview.self.name, preview.opponent.name)
          ) : (
            `${preview.opponent.name}正在前方等着你。准备好出战了吗？`
          )}
        </p>
        <div className={styles.controls}>
          {!result && (
            <Button
              disabled={operation.pending || uncertain}
              aria-label={operation.pending ? '正在提交挑战…' : undefined}
              onClick={() =>
                void operation.run(
                  async (signal) => {
                    let value: BattleResult;
                    try {
                      value = await service.battle(target, signal);
                    } catch (error) {
                      if (signal.aborted) throw error;
                      // A transport failure may follow a committed challenge; do not blindly resubmit.
                      if (
                        error instanceof TypeError ||
                        (error instanceof Error &&
                          /连接|HTTP|timeout|timed out|abort|格式|异常/i.test(error.message))
                      ) {
                        setUncertain(true);
                        throw new Error('未能确认本次挑战结果，请返回列表确认进度后再挑战。');
                      }
                      throw error;
                    }
                    if (!value.rounds.length) {
                      setUncertain(true);
                      throw new Error(
                        '服务端未返回战斗回合，请先返回列表刷新确认挑战状态，避免重复提交',
                      );
                    }
                    return value;
                  },
                  '服务端已结算',
                  (value) => {
                    setResult(value);
                    setFrame(0);
                    onChange?.();
                  },
                )
              }
            >
              {operation.pending ? (
                <LoadingIndicator compact>{'正在提交挑战…'}</LoadingIndicator>
              ) : target.kind === 'tower' ? (
                '开始试炼'
              ) : (
                '开始挑战'
              )}
            </Button>
          )}
          {playing && (
            <Button variant="secondary" onClick={() => setFrame(result!.rounds.length)}>
              跳过演出
            </Button>
          )}
          {done && (
            <>
              <Button variant="secondary" onClick={() => setFrame(0)}>
                重播战斗
              </Button>
              {target.kind === 'tower' && <Button onClick={onContinue}>继续试炼</Button>}
            </>
          )}
        </div>
      </div>
      <OperationNotice notice={operation.notice?.error ? operation.notice : null} />
      {done && (
        <div className={styles.result} role="status">
          <h3>{battleOutcome(result, current)}</h3>
          <p>
            本次累计伤害 {totalDamage}
            {result.reward !== undefined ? ` · 获得 ${result.reward} 积分` : ''}
          </p>
        </div>
      )}
      {result && (
        <BattleRoundLog
          rounds={result.rounds}
          frame={frame}
          selfName={preview.self.name}
          opponentName={preview.opponent.name}
        />
      )}
      {target.kind !== 'pet' && (
        <p className={styles.note}>
          开始挑战将使用每日挑战次数，关闭不会撤销。战斗自动进行，伤害与奖励以实际结算为准。
        </p>
      )}
    </div>
  );
}
