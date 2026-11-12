import type { CSSProperties } from 'react';
import { Leaf, Move, Trees } from 'lucide-react';
import type { Companion } from '@/domain/pet';
import { CampLandscape, CampProp } from './CampLandscape';
import { campProps } from './camp-props';
import { PetSprite } from './PetSprite';
import { useCampMovement } from './use-camp-movement';
import styles from './CampScene.module.css';

export function CampScene({ pet }: { pet: Companion | null }) {
  const { scene, position, moving, facing, moveTo } = useCampMovement(!!pet);
  return (
    <section ref={scene} className={styles.scene} aria-label="伙伴营地场景">
      <div className={styles.landscape}>
        <CampLandscape />
      </div>
      <div className={styles.sceneLabel}>
        <Trees size={16} />
        <span>风眠草地</span>
        <small>伙伴营地</small>
      </div>
      <div className={styles.weather}>
        <Leaf size={15} />
        微风 · 宜散步
      </div>
      <button
        type="button"
        className={styles.ground}
        aria-label="移动伙伴：点击草地或使用 WASD、方向键"
        disabled={!pet}
        onClick={(event) => {
          if (event.detail === 0) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          moveTo(
            ((event.clientX - bounds.left) / bounds.width) * 100,
            ((event.clientY - bounds.top) / bounds.height) * 100,
          );
        }}
      />
      {campProps.map((prop) => (
        <div
          className={styles.prop}
          key={`${prop.x}:${prop.y}`}
          style={
            {
              left: `${prop.x}%`,
              top: `${prop.y}%`,
              zIndex: Math.round(prop.y),
              '--prop-width': prop.kind === 'tree' ? '15%' : '10%',
            } as CSSProperties
          }
        >
          <CampProp kind={prop.kind} />
        </div>
      ))}
      {pet && (
        <div
          className={styles.actor}
          data-testid="camp-actor"
          data-moving={moving}
          style={{ left: `${position.x}%`, top: `${position.y}%`, zIndex: Math.round(position.y) }}
        >
          <span className={styles.name}>
            {pet.name}
            <small>Lv.{pet.level}</small>
          </span>
          <span className={styles.sprite}>
            <PetSprite url={pet.url} name={pet.name} size={104} action={moving ? facing : 'idle'} />
          </span>
          <span className={styles.shadow} />
        </div>
      )}
      <div className={styles.hint}>
        <Move size={14} />
        {pet ? '点击草地散步 · WASD / 方向键移动' : '领养一位伙伴，让营地热闹起来'}
        <small>营地散步不消耗积分，不产生收益</small>
      </div>
    </section>
  );
}
