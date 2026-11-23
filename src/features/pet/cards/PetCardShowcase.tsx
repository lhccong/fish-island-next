import { GalleryVerticalEnd } from 'lucide-react';
import {
  getPetCard,
  petCardStatEntries,
  petShowcaseLimit,
  summarizePetShowcase,
  type PetCardId,
} from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { describePetCardBattleEffect } from './card-battle-copy';
import { usePetCardCatalog } from './catalog-context';
import { PetCardFace } from './PetCardFace';
import styles from './PetCards.module.css';

export function PetCardShowcase({
  cardIds,
  owned,
  showcased,
  pending,
  onDisplay,
  onReplay,
}: {
  cardIds: readonly PetCardId[];
  owned: PetCardId[];
  showcased: PetCardId[];
  pending: boolean;
  onDisplay: (id: PetCardId, displayed: boolean) => void;
  onReplay: (id: PetCardId) => void;
}) {
  const catalog = usePetCardCatalog();
  const vacant = petShowcaseLimit - showcased.length;
  const stats = summarizePetShowcase(showcased, catalog);
  const effects = showcased.flatMap((id) => {
    const battle = getPetCard(id, catalog).battle;
    return battle.kind === 'effect' ? [{ id, effect: battle }] : [];
  });
  return (
    <div className={styles.album}>
      <section aria-label="宠物卡片展示柜" className={styles.shelf}>
        <div className={styles.resultHeading}>
          <h3>宠物卡片展示柜</h3>
          <span>
            {showcased.length} / {petShowcaseLimit}
          </span>
        </div>
        <ul className={styles.shelfGrid}>
          {showcased.map((id) => (
            <li key={id}>
              <PetCardFace id={id} compact />
            </li>
          ))}
          {Array.from({ length: vacant }, (_, index) => (
            <li key={`vacant-${index + showcased.length}`} className={styles.emptyShelf}>
              <GalleryVerticalEnd size={22} aria-hidden="true" />
              <span>空位</span>
            </li>
          ))}
        </ul>
        {showcased.length > 0 && (
          <section className={styles.bonus} aria-label="宠物属性加成预览">
            <h4>宠物属性加成预览</h4>
            <ul className={styles.cardStats}>
              {petCardStatEntries(stats).map(({ stat, label, value }) => (
                <li key={stat}>
                  {label} +{value}
                </li>
              ))}
            </ul>
          </section>
        )}
        {effects.length > 0 && (
          <section className={styles.bonus} aria-label="对战效果预览">
            <h4>对战效果预览</h4>
            <ul className={styles.bonusEffects}>
              {effects.map(({ id, effect }) => (
                <li key={id}>
                  <strong>{effect.name}</strong> {describePetCardBattleEffect(effect)}
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>
      <section aria-label="我的卡片">
        <div className={styles.resultHeading}>
          <h3>我的卡片</h3>
          <span>
            {owned.length} / {cardIds.length}
          </span>
        </div>
        {owned.length === 0 && <p className={styles.emptyFeedback}>开包收藏第一张宠物卡。</p>}
        <ul className={styles.collectionGrid}>
          {cardIds.map((id) => {
            if (!owned.includes(id)) {
              return (
                <li key={id} className={styles.collectionSlot}>
                  <div className={styles.collectionPlaceholder}>
                    <GalleryVerticalEnd size={22} aria-hidden="true" />
                    <span>未收藏</span>
                  </div>
                </li>
              );
            }
            const card = getPetCard(id, catalog);
            const displayed = showcased.includes(id);
            return (
              <li key={id} className={styles.collectionSlot}>
                <PetCardFace id={id} />
                <div className={styles.collectionActions}>
                  <Button
                    variant="secondary"
                    disabled={pending || (!displayed && !vacant)}
                    aria-label={`${displayed ? '撤下' : '上架'}${card.name}`}
                    onClick={() => onDisplay(id, displayed)}
                  >
                    {displayed ? '撤下' : '上架'}
                  </Button>
                  {card.grade === 'shiny' && (
                    <Button
                      variant="secondary"
                      aria-label={`重看${card.name}特效`}
                      onClick={() => onReplay(id)}
                    >
                      看特效
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
