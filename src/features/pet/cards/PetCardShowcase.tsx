import { ArrowUp, GalleryVerticalEnd, Pin, PinOff, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  getPetCard,
  petCardStatEntries,
  petShowcaseLimit,
  summarizePetShowcase,
  type PetCardId,
  type PetCardOwned,
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
  upgrades,
  bulkUpgrade,
}: {
  cardIds: readonly PetCardId[];
  owned: PetCardId[];
  showcased: PetCardId[];
  pending: boolean;
  onDisplay: (id: PetCardId, displayed: boolean) => void;
  onReplay: (id: PetCardId) => void;
  bulkUpgrade?: ReactNode;
  upgrades?: {
    collection: ReadonlyMap<PetCardId, PetCardOwned>;
    onUpgrade: (card: PetCardOwned) => void;
  };
}) {
  const catalog = usePetCardCatalog();
  const vacant = petShowcaseLimit - showcased.length;
  const stats = summarizePetShowcase(showcased, catalog, upgrades?.collection);
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
              <PetCardFace id={id} compact stars={upgrades?.collection.get(id)?.stars} />
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
          <div className={styles.collectionHeadingActions}>
            <span>{upgrades ? `${owned.length} 张` : `${owned.length} / ${cardIds.length}`}</span>
            {bulkUpgrade}
          </div>
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
            const progress = upgrades?.collection.get(id);
            const displayed = showcased.includes(id);
            const displayLabel = displayed ? '撤下' : '上架';
            const DisplayIcon = displayed ? PinOff : Pin;
            return (
              <li key={id} className={styles.collectionSlot}>
                <PetCardFace id={id} stars={progress?.stars} />
                <div className={styles.collectionActions}>
                  {progress && (
                    <p className={styles.materials}>
                      重复卡 {progress.duplicates} 张
                      {progress.upgradeCost === null ? ' · 已满星' : ''}
                    </p>
                  )}
                  {progress && progress.upgradeCost !== null && (
                    <Button
                      className={styles.collectionAction ?? ''}
                      variant="secondary"
                      disabled={pending || progress.duplicates < progress.upgradeCost}
                      aria-label={`升星${card.name}，消耗 ${progress.upgradeCost} 张`}
                      title={`升星 · 消耗 ${progress.upgradeCost} 张重复卡`}
                      onClick={() => upgrades?.onUpgrade(progress)}
                    >
                      <span className={styles.collectionActionIcon} aria-hidden="true">
                        <ArrowUp size={18} />
                        <span>{progress.upgradeCost}</span>
                      </span>
                      <span>升星</span>
                    </Button>
                  )}
                  <Button
                    className={styles.collectionAction ?? ''}
                    variant="secondary"
                    disabled={pending || (!displayed && !vacant)}
                    aria-label={`${displayLabel}${card.name}`}
                    title={`${displayLabel}展示柜`}
                    data-showcased={displayed || undefined}
                    onClick={() => onDisplay(id, displayed)}
                  >
                    <DisplayIcon size={18} aria-hidden="true" />
                    <span>{displayLabel}</span>
                  </Button>
                  {card.grade === 'shiny' && (
                    <Button
                      className={styles.collectionAction ?? ''}
                      variant="secondary"
                      aria-label={`重看${card.name}特效`}
                      title="重看闪耀特效"
                      onClick={() => onReplay(id)}
                    >
                      <Sparkles size={18} aria-hidden="true" />
                      <span>特效</span>
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
