import { useEffect, useRef } from 'react';
import type { BattleRound, Challenger } from '@/domain/pet';
import { PetSprite } from './PetSprite';
import { BattleFeedback } from './BattleFeedback';
import styles from './PixelBattle.module.css';

export function BattleFighter({
  fighter,
  side,
  current,
  frame,
  playing,
}: {
  fighter: Challenger;
  side: 'self' | 'opponent';
  current: BattleRound | undefined;
  frame: number;
  playing: boolean;
}) {
  const sprite = useRef<HTMLDivElement>(null);
  const attacking = playing && current?.attacker === side;
  useEffect(() => {
    if (
      !sprite.current ||
      !current ||
      !playing ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const direction = side === 'self' ? 1 : -1;
    const animation = sprite.current.animate(
      attacking
        ? [
            { transform: 'translate(0, 0)' },
            { transform: `translate(${direction * 28}px, ${-direction * 12}px)`, offset: 0.35 },
            { transform: 'translate(0, 0)' },
          ]
        : current.dodge
          ? [
              { transform: 'translateX(0)' },
              { transform: `translateX(${-direction * 18}px)` },
              { transform: 'translateX(0)' },
            ]
          : [
              { opacity: 1 },
              { opacity: 0.3, transform: 'translateX(5px)' },
              { opacity: 1, transform: 'translateX(-5px)' },
              { transform: 'translateX(0)' },
            ],
      { duration: 480, easing: 'steps(5, end)' },
    );
    return () => animation.cancel();
  }, [frame, current, playing, side, attacking]);
  return (
    <div
      className={styles.fighter}
      data-side={side}
      data-fallen={current && (side === 'self' ? current.selfHealth : current.opponentHealth) <= 0}
    >
      <div className={styles.platform} />
      <div ref={sprite} className={styles.sprite}>
        <PetSprite
          url={fighter.url}
          name={fighter.name}
          size={side === 'self' ? 136 : 112}
          action={attacking ? (side === 'self' ? 'run' : 'run-left') : 'idle'}
        />
      </div>
      {playing && current && (
        <BattleFeedback current={current} attacking={attacking} frame={frame} />
      )}
    </div>
  );
}
