import {
  Apple,
  Heart,
  Sparkles,
  Sword,
  Hand,
  Footprints,
  Crown,
  Gem,
  Feather,
  Pencil,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { Companion, PetPort } from '@/domain/pet';
import { boundedPercent, equipmentSlots, petCardGrades } from '@/domain/pet';
import { CardAtlasImage } from '@/shared/ui/CardAtlasImage';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { PetSprite } from './PetSprite';
import { ItemIcon } from './ItemIcon';
import { EquipmentAffixes } from './EquipmentAffixes';
import { formatPetStat } from './format-stat';
import styles from './CompanionSummary.module.css';

const slots = [
  { id: 'weapon', icon: Sword },
  { id: 'head', icon: Crown },
  { id: 'hand', icon: Hand },
  { id: 'necklace', icon: Gem },
  { id: 'foot', icon: Footprints },
  { id: 'wing', icon: Feather },
] as const;

export function CompanionSummary({
  pet,
  service,
  onOpen,
  headerAction,
  compact = false,
}: {
  pet: Companion;
  service: PetPort;
  onOpen?: (panel: 'care' | 'bag') => void;
  headerAction?: ReactNode;
  compact?: boolean;
}) {
  const attributes = (
    <dl className={styles.stats} aria-label="伙伴属性">
      {pet.stats.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{formatPetStat(label, value)}</dd>
        </div>
      ))}
      {!pet.stats.length && <div className={styles.noStats}>暂无属性数据</div>}
    </dl>
  );
  return (
    <div className={styles.summary} data-compact={compact}>
      <header className={styles.identity}>
        <h2>
          {pet.name} <small>Lv.{pet.level}</small>
        </h2>
        {onOpen && (
          <button
            type="button"
            className={styles.edit}
            aria-label="修改伙伴名字"
            title="修改伙伴名字"
            onClick={() => onOpen('care')}
          >
            <Pencil size={16} aria-hidden="true" />
          </button>
        )}
        {headerAction && <div className={styles.headerAction}>{headerAction}</div>}
      </header>
      <div className={styles.dressing}>
        <div className={styles.portrait}>
          <PetSprite url={pet.url} name={pet.name} size={132} />
        </div>
        {slots.map(({ id, icon: Icon }) => {
          const item = pet.equipment.find(
            (entry) => entry.slot === id || (id === 'wing' && entry.slot === 'wings'),
          )?.item;
          const label = `${equipmentSlots[id]}：${item ? item.name : '未装备'}`;
          if (item)
            return (
              <EquipmentAffixes
                key={id}
                service={service}
                petId={pet.id}
                slot={id}
                item={item}
                trigger={
                  <button type="button" className={styles.slot} aria-label={label} title={label}>
                    <ItemIcon url={item.icon} name={item.name} level={item.level} />
                  </button>
                }
              />
            );
          return (
            <button
              key={id}
              type="button"
              className={styles.slot}
              disabled={!onOpen}
              aria-label={label}
              title={label}
              onClick={() => onOpen?.('bag')}
            >
              <Icon size={24} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {pet.showcaseCards.length > 0 && (
        <ul aria-label="上架宠物卡片" role="list" className={styles.showcase}>
          {pet.showcaseCards.map(({ id, name, grade, stars, art }) => {
            const label = `${name} · ${petCardGrades[grade].name} · ${stars} 星`;
            return (
              <li key={id} data-grade={grade} aria-label={label} title={label}>
                <CardAtlasImage
                  className={styles.showcaseArt ?? ''}
                  src={art.url}
                  alt=""
                  tile={art.tile}
                  portrait={art.portrait}
                />
              </li>
            );
          })}
        </ul>
      )}
      <div className={styles.vitals}>
        {[
          { name: '心情', value: pet.mood, icon: Heart },
          { name: '饱食', value: pet.hunger, icon: Apple },
        ].map(({ name, value, icon: Icon }) => (
          <div key={name} className={styles.vital} title={name} data-vital={name}>
            <Icon size={18} aria-hidden="true" />
            <meter min={0} max={100} value={boundedPercent(value)} aria-label={name} />
            <span>{value}/100</span>
          </div>
        ))}
        <div className={styles.experience} title="当前经验" aria-label={`当前经验 ${pet.exp}`}>
          <Sparkles size={18} aria-hidden="true" />
          <span>经验</span>
          <strong>{pet.exp}</strong>
        </div>
      </div>
      {compact ? (
        <ScrollArea label="伙伴属性" gutter="reserved" className={styles.statsScroll ?? ''}>
          {attributes}
        </ScrollArea>
      ) : (
        attributes
      )}
    </div>
  );
}
