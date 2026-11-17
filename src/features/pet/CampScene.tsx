import type { CSSProperties } from 'react';
import { Leaf, Move, Trees } from 'lucide-react';
import {
  treasureSites,
  type Companion,
  type TreasureSiteId,
  type TreasureState,
} from '@/domain/pet';
import { CampLandscape, CampProp } from './CampLandscape';
import { campProps } from './camp-props';
import { PetSprite } from './PetSprite';
import { useCampMovement } from './use-camp-movement';
import { CampTreasureSites } from './CampTreasureSites';
import styles from './CampScene.module.css';

export function CampScene({
  pet,
  treasure,
  digging,
  animating,
  canDig,
  onDig,
}: {
  pet: Companion | null;
  treasure: TreasureState['active'];
  digging: boolean;
  animating: boolean;
  canDig: boolean;
  onDig: (site: TreasureSiteId) => void;
}) {
  const { scene, position, moving, facing, moveTo, placeAt } = useCampMovement(!!pet && !digging);
  const digSite = treasureSites.find((site) => site.id === treasure?.siteId);
  const actorPosition = digSite ?? position;
  return (
    <section ref={scene} className={styles.scene} aria-label="伙伴营地场景">
      <div className={styles.landscape}>
        <CampLandscape />
      </div>
      <div className={styles.sceneLabel}>
        <Trees size={16} aria-hidden="true" />
        <span>风眠草地</span>
      </div>
      <div className={styles.weather} title="微风 · 宜散步" aria-label="微风 · 宜散步">
        <Leaf size={16} aria-hidden="true" />
      </div>
      <button
        type="button"
        className={styles.ground}
        aria-label="移动伙伴：点击草地或使用 WASD、方向键"
        disabled={!pet || digging}
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
          data-moving={moving && !digging}
          style={{
            left: `${actorPosition.x}%`,
            top: `${actorPosition.y}%`,
            zIndex: Math.round(actorPosition.y),
          }}
        >
          <span className={styles.name}>
            {pet.name}
            <small>Lv.{pet.level}</small>
          </span>
          <span className={styles.sprite}>
            <PetSprite
              url={pet.url}
              name={pet.name}
              size={104}
              action={moving && !digging ? facing : 'idle'}
            />
          </span>
          <span className={styles.shadow} />
        </div>
      )}
      {pet && (
        <CampTreasureSites
          active={treasure}
          animating={animating}
          available={canDig}
          onDig={(id) => {
            const site = treasureSites.find((site) => site.id === id)!;
            placeAt(site.x, site.y);
            onDig(id);
          }}
        />
      )}
      <div className={styles.hint}>
        <Move size={14} aria-hidden="true" />
        {digging ? '正在挖宝，请稍候…' : pet ? '点击散步 · WASD / ↑↓←→' : '领养伙伴后开启散步'}
      </div>
    </section>
  );
}
