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
import type { Companion } from '@/domain/pet';
import { boundedPercent, equipmentSlots } from '@/domain/pet';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { PetSprite } from './PetSprite';
import { ItemIcon } from './ItemIcon';
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
  onOpen,
  compact = false,
}: {
  pet: Companion;
  onOpen?: (panel: 'care' | 'bag') => void;
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
              {item ? (
                <ItemIcon url={item.icon} name={item.name} level={item.level} />
              ) : (
                <Icon size={24} aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
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
