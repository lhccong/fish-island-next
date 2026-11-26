import { ChevronRight, Star } from 'lucide-react';
import { petCardGrades, type BattleShowcaseCard } from '@/domain/pet';
import { CardAtlasImage } from '@/shared/ui/CardAtlasImage';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { ShowcaseCardDetails } from './ShowcaseCardDetails';
import styles from './CompanionCards.module.css';
import panelStyles from './Panels.module.css';

export function CompanionCards({ cards }: { cards: BattleShowcaseCard[] | undefined }) {
  return (
    <section className={panelStyles.section} aria-label="上架卡片">
      <h3 data-tone="violet">上架卡片</h3>
      {cards?.length ? (
        <ul className={styles.list} role="list" aria-label="上架卡片">
          {cards.map((entry) => (
            <li key={entry.card.id}>
              <CompanionCard entry={entry} />
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>{cards ? '尚未上架卡片。' : '暂未返回卡片资料。'}</p>
      )}
    </section>
  );
}

function CompanionCard({ entry }: { entry: BattleShowcaseCard }) {
  const { card } = entry;
  return (
    <Dialog
      layer="nested"
      title={card.name}
      description={`${petCardGrades[card.grade].name} · ${card.stars} 星`}
      dismissLabel="关闭卡片详情"
      showCloseAction={false}
      className={styles.dialog ?? ''}
      trigger={
        <button
          type="button"
          className={styles.row}
          aria-label={`查看${card.name}效果，${card.stars} 星`}
        >
          <CardAtlasImage
            className={styles.art ?? ''}
            src={card.art.url}
            tile={card.art.tile}
            portrait={card.art.portrait}
            alt=""
          />
          <span className={styles.identity}>
            <span>{card.name}</span>
            <span className={styles.stars} aria-hidden="true">
              {Array.from({ length: card.stars }, (_, index) => (
                <Star key={index} size={13} />
              ))}
            </span>
          </span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      }
    >
      <ScrollArea label="卡片属性与效果" className={styles.scroll ?? ''} gutter="reserved">
        <div className={styles.body}>
          <ShowcaseCardDetails entry={entry} />
        </div>
      </ScrollArea>
    </Dialog>
  );
}
