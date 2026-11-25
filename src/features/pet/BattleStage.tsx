import type { BattlePreview, BattleRound } from '@/domain/pet';
import { CardAtlasImage } from '@/shared/ui/CardAtlasImage';
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
      <div className={styles.self}>
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
      <div className={styles.opponent}>
        <BattleFighter
          fighter={preview.opponent}
          side="opponent"
          boss={!tower && !duel}
          current={current}
          frame={frame}
          playing={playing}
        />
        <CombatantStatus
          fighter={preview.opponent}
          health={current?.opponentHealth}
          side="opponent"
          showEquipment={duel}
        />
      </div>
      {playing && !!current?.cardActivations?.length && (
        <div key={frame} className={styles.cardActivations} aria-hidden="true">
          {current.cardActivations.map(({ side, card, effectName }) => (
            <div key={side} className={styles.cardActivation} data-card-activation={side}>
              <CardAtlasImage
                className={styles.cardActivationArt ?? ''}
                src={card.art.url}
                tile={card.art.tile}
                portrait={card.art.portrait}
                alt=""
              />
              <div className={styles.cardActivationText}>
                <span className={styles.cardActivationLabel}>卡片生效</span>
                <strong>{card.name}</strong>
                <span>
                  {preview[side].name} · {effectName}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
