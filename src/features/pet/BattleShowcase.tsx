import { useState } from 'react';
import { petCardGrades, type BattleShowcaseCard } from '@/domain/pet';
import { CardAtlasImage } from '@/shared/ui/CardAtlasImage';
import { HoverPreview } from '@/shared/ui/HoverPreview';
import { Popover } from '@/shared/ui/Popover';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { ShowcaseCardDetails } from './ShowcaseCardDetails';
import styles from './BattleShowcase.module.css';

export function BattleShowcase({ owner, cards }: { owner: string; cards: BattleShowcaseCard[] }) {
  return (
    <ul className={styles.lineup} role="list" aria-label={`${owner}出战卡牌`}>
      {cards.map((entry) => (
        <li key={entry.card.id}>
          <BattleCard entry={entry} />
        </li>
      ))}
    </ul>
  );
}

function BattleCard({ entry }: { entry: BattleShowcaseCard }) {
  const [open, setOpen] = useState(false);
  const { card } = entry;
  const label = `${card.name}效果`;
  const details = (
    <div className={styles.details}>
      <p className={styles.rarity}>
        {petCardGrades[card.grade].name} · {card.stars} 星
      </p>
      <ShowcaseCardDetails entry={entry} />
    </div>
  );
  return (
    <HoverPreview
      label={label}
      size="detail"
      disabled={open}
      content={
        <>
          <strong className={styles.name}>{card.name}</strong>
          {details}
        </>
      }
    >
      {(descriptionId) => (
        <Popover
          open={open}
          onOpenChange={setOpen}
          label={label}
          className={styles.popover ?? ''}
          trigger={
            <button
              type="button"
              className={styles.trigger}
              aria-label={`查看${label}`}
              aria-describedby={descriptionId}
              data-grade={card.grade}
            >
              <CardAtlasImage
                className={styles.art ?? ''}
                alt=""
                src={card.art.url}
                tile={card.art.tile}
                portrait={card.art.portrait}
                loadingLabel="加载"
              />
            </button>
          }
        >
          <ScrollArea className={styles.scroll ?? ''} gutter="reserved" label={`${label}详情`}>
            {details}
          </ScrollArea>
        </Popover>
      )}
    </HoverPreview>
  );
}
