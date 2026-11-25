import { useEffect, useState, type RefObject } from 'react';
import type { BattlePreview, PetPort, PetRank } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { PanelDialog } from './PanelDialog';
import { BattleStage } from './BattleStage';
import { OperationNotice } from './Feedback';
import { TournamentResult } from './TournamentResult';
import { battleFrameDuration, roundNarration } from './battle-presentation';
import styles from './PixelBattle.module.css';

export function TournamentBattle({
  preview,
  settlement,
  pending,
  notice,
  onClose,
  returnFocusRef,
}: {
  preview: BattlePreview | null;
  settlement: {
    target: { rank: number; entry?: PetRank };
    result: Awaited<ReturnType<PetPort['compete']>>;
  } | null;
  pending: boolean;
  notice: { error: boolean; message: string } | null;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const [frame, setFrame] = useState(0);
  const rounds = settlement?.result.rounds ?? [];
  const playing = !!settlement && frame < rounds.length;
  const current = rounds[Math.min(frame, rounds.length - 1)];
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setFrame((value) => value + 1), battleFrameDuration(current));
    return () => clearTimeout(timer);
  }, [playing, frame, current]);
  return (
    <PanelDialog
      title="武道大会战斗"
      description="回放真实结算的战斗，关闭不会撤销挑战。"
      appearance="pixel"
      onClose={onClose}
      returnFocusRef={returnFocusRef}
    >
      <div className={styles.battle}>
        <header className={styles.battleHeader}>
          <h3>排位对战</h3>
          <span>
            {playing
              ? `回合 ${current?.roundNumber ?? frame + 1} / ${rounds.at(-1)?.roundNumber ?? rounds.length}`
              : settlement
                ? '战斗结束'
                : pending
                  ? '正在挑战'
                  : '挑战未完成'}
          </span>
        </header>
        {preview && (
          <BattleStage
            preview={preview}
            current={current}
            frame={frame}
            playing={playing}
            tower={false}
            duel
          />
        )}
        {pending && (
          <LoadingIndicator compact={!!preview}>正在挑战，等待战斗结果…</LoadingIndicator>
        )}
        {current && preview && (
          <div className={styles.console}>
            <p aria-live="polite">
              {roundNarration(current, preview.self.name, preview.opponent.name)}
            </p>
            <div className={styles.controls}>
              {playing ? (
                <Button variant="secondary" onClick={() => setFrame(rounds.length)}>
                  跳过演出
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setFrame(0)}>
                  重播战斗
                </Button>
              )}
            </div>
          </div>
        )}
        <OperationNotice notice={notice} />
        {settlement && !playing && <TournamentResult {...settlement} preview={preview} />}
        <div className={styles.controls}>
          <Button variant="secondary" onClick={onClose}>
            返回榜单
          </Button>
        </div>
      </div>
    </PanelDialog>
  );
}
