import { useState } from 'react';
import { getPetCard, petCardGrades, type PetCardId } from '@/domain/pet';
import { CardAtlasImage } from '@/shared/ui/CardAtlasImage';
import { Select } from '@/shared/ui/Select';
import { petCardImage } from './card-art';
import { usePetCardCatalog } from './catalog-context';
import styles from './PetCardEncyclopedia.module.css';

const allSeries = '__all__';
const seriesPrefix = 'pool:';

export function PetCardEncyclopedia({ owned }: { owned: readonly PetCardId[] }) {
  const catalog = usePetCardCatalog();
  const [series, setSeries] = useState(allSeries);
  const pools = catalog.packIds.map((id) => catalog.packs[id]!);
  const selectedPool = pools.find(({ id }) => series === `${seriesPrefix}${id}`);
  const cardIds = [...new Set(selectedPool?.ids ?? pools.flatMap(({ ids }) => ids))];
  const ownedIds = new Set(owned);
  const collected = cardIds.filter((id) => ownedIds.has(id)).length;

  return (
    <section aria-label="宠物卡片图鉴" className={styles.encyclopedia}>
      <div className={styles.header}>
        {pools.length > 1 && (
          <Select
            label="图鉴系列"
            value={selectedPool ? series : allSeries}
            options={[
              { value: allSeries, label: '全部系列' },
              ...pools.map(({ id, name }) => ({
                value: `${seriesPrefix}${id}`,
                label: name,
              })),
            ]}
            onValueChange={setSeries}
          />
        )}
        <p className={styles.progress} role="status">
          已收集 {collected} / {cardIds.length}
        </p>
      </div>
      <ul role="list" className={styles.cards}>
        {cardIds.map((id) => {
          const { name, grade, art } = getPetCard(id, catalog);
          const { url, tile, portrait } = petCardImage(art);
          const isOwned = ownedIds.has(id);
          return (
            <li key={id} className={styles.card} data-collected={isOwned}>
              <CardAtlasImage src={url} tile={tile} portrait={portrait} alt="" />
              <div className={styles.details}>
                <strong>{name}</strong>
                <div className={styles.attributes}>
                  <span>{petCardGrades[grade].name}</span>
                  {!isOwned && <span>未收集</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
