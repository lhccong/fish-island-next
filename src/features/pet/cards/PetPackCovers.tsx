import { Check, PawPrint, ScrollText, Sparkles } from 'lucide-react';
import { getPetCard, petPackSize, type PetCardPack } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { petCardArt } from './card-art';
import { usePetCardCatalog } from './catalog-context';
import { usePackSwipe, type MovePack } from './use-pack-swipe';
import styles from './PetCards.module.css';

export function PetPackCovers({
  pack,
  opening,
  firstPack,
  move,
}: {
  pack: PetCardPack;
  opening: boolean;
  firstPack: boolean;
  move: MovePack | undefined;
}) {
  const catalog = usePetCardCatalog();
  const swipe = usePackSwipe(move);
  const pairStart = Math.floor(catalog.packIds.indexOf(pack.id) / 2) * 2;
  const covers = opening ? [pack.id] : catalog.packIds.slice(pairStart, pairStart + 2);

  return (
    <div
      className={styles.packStage}
      role="region"
      aria-label="卡包封面"
      data-paired={covers.length === 2}
      data-swipe-enabled={!!move}
      {...swipe}
    >
      {covers.map((id, index) => {
        const cover = catalog.packs[id]!;
        const selected = id === pack.id;
        const PackIcon = id === 'kingdoms' ? ScrollText : PawPrint;
        return (
          <article key={id} className={styles.packTile} data-selected={selected}>
            <div className={styles.pack} data-pack={id} data-opening={opening} aria-hidden="true">
              <div className={styles.packSeal} />
              <div className={styles.packWrapper}>
                <span className={styles.packMark}>
                  <PackIcon size={13} /> 鱼岛伙伴
                </span>
                <strong>{cover.name}</strong>
                <span
                  className={styles.packIllustration}
                  style={petCardArt(getPetCard(cover.cover, catalog).art)}
                />
                <span className={styles.packLabel}>
                  <Sparkles size={13} /> {petPackSize} 张卡片
                </span>
              </div>
              <Sparkles className={styles.tornSpark} size={32} />
            </div>
            <div className={styles.packInfo}>
              <h3>
                {covers.length === 2 ? (
                  <Button
                    className={styles.packChoice ?? ''}
                    variant="secondary"
                    aria-pressed={selected}
                    disabled={!move}
                    onClick={() => {
                      if (!selected) move?.(index === 0 ? -1 : 1, true);
                    }}
                  >
                    {selected && <Check size={14} aria-hidden="true" />}
                    {cover.name}
                  </Button>
                ) : (
                  cover.name
                )}
              </h3>
              <p>
                每包 {petPackSize} 张 · 收录 {cover.ids.length} 张
              </p>
              {selected && firstPack && cover.shinyIds.length > 0 && (
                <p className={styles.firstPack}>
                  <Sparkles size={15} aria-hidden="true" /> 首包必有闪耀卡
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
