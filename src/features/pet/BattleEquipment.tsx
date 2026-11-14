import { Sword, Crown, Hand, Footprints, Gem, Feather } from 'lucide-react';
import type { Challenger } from '@/domain/pet';
import { equipmentSlots } from '@/domain/pet';
import { ItemIcon } from './ItemIcon';
import styles from './PixelBattle.module.css';

const slots = [
  { slot: 'weapon', icon: Sword },
  { slot: 'head', icon: Crown },
  { slot: 'hand', icon: Hand },
  { slot: 'foot', icon: Footprints },
  { slot: 'necklace', icon: Gem },
  { slot: 'wing', icon: Feather },
] as const;
export function BattleEquipment({ fighter }: { fighter: Challenger }) {
  return (
    <section className={styles.equipment} aria-label={`${fighter.name}出战装备`}>
      {fighter.equipment === undefined ? (
        <small>装备资料未返回</small>
      ) : (
        <div className={styles.gearGrid}>
          {slots.map(({ slot, icon: Icon }) => {
            const equipped = fighter.equipment?.find(
              (entry) => entry.slot === slot || (slot === 'wing' && entry.slot === 'wings'),
            );
            return (
              <span className={styles.gear} key={slot}>
                {equipped ? (
                  <ItemIcon
                    size="compact"
                    url={equipped.item.icon}
                    name={`${equipmentSlots[slot]}：${equipped.item.name}`}
                    level={equipped.item.level}
                  />
                ) : (
                  <span
                    className={styles.emptyGear}
                    role="img"
                    aria-label={`${equipmentSlots[slot]}未装备`}
                  >
                    <Icon size={14} aria-hidden="true" />
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}
