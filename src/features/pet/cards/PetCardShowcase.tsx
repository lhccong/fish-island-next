import { ArrowUp, GalleryVerticalEnd, Pin, PinOff, Sparkles } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import {
  getPetCard,
  petCardGrades,
  petCardStatEntries,
  petShowcaseLimit,
  summarizePetShowcase,
  type PetCardId,
  type PetCardOwned,
} from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { describePetCardBattleEffect } from './card-battle-copy';
import { usePetCardCatalog } from './catalog-context';
import { PetCardFace } from './PetCardFace';
import styles from './PetCards.module.css';

const all = '__all__';
const seriesPrefix = 'pool:';
const gradeOptions = [
  { value: all, label: '全部品质' },
  ...Object.entries(petCardGrades).map(([value, { name: label }]) => ({ value, label })),
];

export function PetCardShowcase({
  cardIds,
  owned,
  showcased,
  pending,
  onDisplay,
  onRemoveAll,
  onReplay,
  upgrades,
  bulkUpgrade,
}: {
  cardIds: readonly PetCardId[];
  owned: PetCardId[];
  showcased: PetCardId[];
  pending: boolean;
  onDisplay: (id: PetCardId, displayed: boolean) => void;
  onRemoveAll: () => void;
  onReplay: (id: PetCardId) => void;
  bulkUpgrade?: ReactNode;
  upgrades?: {
    collection: ReadonlyMap<PetCardId, PetCardOwned>;
    onUpgrade: (card: PetCardOwned) => void;
  };
}) {
  const catalog = usePetCardCatalog();
  const shelfHeading = useRef<HTMLHeadingElement>(null);
  const [series, setSeries] = useState(all);
  const [grade, setGrade] = useState(all);
  const seriesCards =
    series === all ? undefined : catalog.packs[series.slice(seriesPrefix.length)]?.ids;
  const visibleCards = cardIds.filter(
    (id) =>
      (!seriesCards || seriesCards.includes(id)) &&
      (grade === all || getPetCard(id, catalog).grade === grade),
  );
  const ownedCards = new Set(owned);
  const visibleOwned = visibleCards.filter((id) => ownedCards.has(id)).length;
  const visibleShowcased = showcased.filter((id) => !!catalog.cards[id]);
  const vacant = petShowcaseLimit - visibleShowcased.length;
  const stats = summarizePetShowcase(visibleShowcased, catalog, upgrades?.collection);
  const bonusLabel = upgrades ? '宠物战斗属性加成' : '宠物属性加成预览';
  const effects = visibleShowcased.flatMap((id) => {
    const battle = getPetCard(id, catalog).battle;
    return battle.kind === 'effect' ? [{ id, effect: battle }] : [];
  });
  return (
    <div className={styles.album}>
      <section aria-label="宠物卡片展示柜" className={styles.shelf}>
        <div className={styles.shelfHeading}>
          <h3 ref={shelfHeading} tabIndex={-1}>
            宠物卡片展示柜
          </h3>
          <div className={styles.collectionHeadingActions}>
            <span aria-live="polite">
              {visibleShowcased.length} / {petShowcaseLimit}
            </span>
            <Button
              variant="secondary"
              disabled={pending || !showcased.length}
              onClick={(event) => {
                if (event.detail === 0) shelfHeading.current?.focus();
                onRemoveAll();
              }}
            >
              一键下架
            </Button>
          </div>
        </div>
        <ul className={styles.shelfGrid}>
          {visibleShowcased.map((id) => (
            <li key={id}>
              <PetCardFace id={id} compact stars={upgrades?.collection.get(id)?.stars} />
              <Button
                variant="secondary"
                disabled={pending}
                aria-label={`下架${getPetCard(id, catalog).name}`}
                onClick={(event) => {
                  if (event.detail === 0) shelfHeading.current?.focus();
                  onDisplay(id, true);
                }}
              >
                下架
              </Button>
            </li>
          ))}
          {Array.from({ length: vacant }, (_, index) => (
            <li key={`vacant-${index + visibleShowcased.length}`} className={styles.emptyShelf}>
              <GalleryVerticalEnd size={22} aria-hidden="true" />
              <span>空位</span>
            </li>
          ))}
        </ul>
        {visibleShowcased.length > 0 && (
          <section className={styles.bonus} aria-label={bonusLabel}>
            <h4>{bonusLabel}</h4>
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
        <div className={styles.collectionFilters} role="group" aria-label="卡片筛选">
          {upgrades && catalog.packIds.length > 1 && (
            <Select
              label="卡片系列"
              value={series}
              options={[
                { value: all, label: '全部系列' },
                ...catalog.packIds.map((id) => ({
                  value: `${seriesPrefix}${id}`,
                  label: catalog.packs[id]!.name,
                })),
              ]}
              onValueChange={setSeries}
            />
          )}
          <Select label="卡片品质" value={grade} options={gradeOptions} onValueChange={setGrade} />
        </div>
        <div className={styles.resultHeading}>
          <h3>我的卡片</h3>
          <div className={styles.collectionHeadingActions}>
            <span>
              {upgrades ? `${visibleOwned} 张` : `${visibleOwned} / ${visibleCards.length}`}
            </span>
            {bulkUpgrade}
          </div>
        </div>
        {owned.length === 0 && <p className={styles.emptyFeedback}>开包收藏第一张宠物卡。</p>}
        {owned.length > 0 && visibleCards.length === 0 && (
          <p className={styles.emptyFeedback} role="status">
            没有符合筛选条件的卡片。
          </p>
        )}
        <ul className={styles.collectionGrid}>
          {visibleCards.map((id) => {
            if (!ownedCards.has(id)) {
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
            const displayLabel = displayed ? '下架' : '上架';
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
                    disabled={pending || (!displayed && showcased.length >= petShowcaseLimit)}
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
