import type { BattlePreview, BattleRound } from '@/domain/pet';
import { PixelLandscape } from './PixelLandscape';
import { CombatantStatus } from './CombatantStatus';
import { BattleFighter } from './BattleFighter';
import styles from './PixelBattle.module.css';

export function BattleStage({
  preview,
  current,
  frame,
  playing,
  tower,
  duel,
}: {
  preview: BattlePreview;
  current: BattleRound | undefined;
  frame: number;
  playing: boolean;
  tower: boolean;
  duel: boolean;
}) {
  return (
    <div className={styles.stage} aria-label="挑战演出">
      <PixelLandscape tower={tower} />
      <CombatantStatus
        fighter={preview.opponent}
        health={current?.opponentHealth}
        side="opponent"
        showEquipment={duel}
      />
      <BattleFighter
        fighter={preview.opponent}
        side="opponent"
        current={current}
        frame={frame}
        playing={playing}
      />
      <BattleFighter
        fighter={preview.self}
        side="self"
        current={current}
        frame={frame}
        playing={playing}
      />
      <CombatantStatus
        fighter={preview.self}
        health={current?.selfHealth}
        side="self"
        showEquipment
      />
    </div>
  );
}
