import { useState, type ReactNode } from 'react';
import { Backpack, Check, Gem, Shirt, SlidersHorizontal } from 'lucide-react';
import { type Companion, type PetItem, equipmentSlots } from '@/domain/pet';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import { ItemIcon } from './ItemIcon';
import { formatPetStat } from './format-stat';
import styles from './InventoryGrid.module.css';

export function InventoryGrid({
  items,
  total,
  pet,
  pending,
  onEquip,
  onManage,
  pagination,
}: {
  items: PetItem[];
  total: number;
  pet: Companion;
  pending: boolean;
  onEquip: (id: string) => void;
  onManage: () => void;
  pagination: ReactNode;
}) {
  const [selectedId, setSelectedId] = useState('');
  const [filter, setFilter] = useState<'all' | 'equipment' | 'items'>('all');
  const visible = items.filter(
    (item) => filter === 'all' || (filter === 'equipment' ? !!item.slot : !item.slot),
  );
  const selected = visible.find((item) => item.id === selectedId) ?? visible[0];
  const equipped = (item: PetItem) => pet.equipment.some((entry) => entry.item.id === item.id);
  return (
    <div className={styles.inventory}>
      <header className={styles.header}>
        <h2>
          <Backpack size={19} aria-hidden="true" />
          行囊{' '}
          <small>
            {items.length}/{total}
          </small>
        </h2>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onManage}
          aria-label="管理行囊"
          title="管理行囊"
        >
          <SlidersHorizontal size={18} aria-hidden="true" />
        </button>
      </header>
      <div className={styles.filters} role="group" aria-label="行囊筛选">
        {(
          [
            { id: 'all', name: '全部', icon: Backpack },
            { id: 'equipment', name: '装备', icon: Shirt },
            { id: 'items', name: '其他物品', icon: Gem },
          ] as const
        ).map(({ id, name, icon: Icon }) => (
          <button
            type="button"
            key={id}
            aria-label={name}
            aria-pressed={filter === id}
            title={name}
            onClick={() => setFilter(id)}
          >
            <Icon size={17} aria-hidden="true" />
            {id === 'all' && <span>全部</span>}
          </button>
        ))}
      </div>
      <ScrollArea label="行囊物品网格" gutter="reserved" className={styles.scroll ?? ''}>
        <div className={styles.grid}>
          {visible.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.cell}
              data-rarity={item.rarity}
              aria-label={`${item.name}，数量 ${item.quantity}${equipped(item) ? '，已穿戴' : ''}`}
              aria-pressed={selected?.id === item.id}
              title={item.name}
              onClick={() => setSelectedId(item.id)}
            >
              <ItemIcon url={item.icon} name={item.name} level={item.slot ? item.level : 0} />
              <small className={styles.quantity}>{item.quantity}</small>
              {equipped(item) && <Check className={styles.check} size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
        {!visible.length && (
          <div className={styles.empty}>
            <Backpack size={28} aria-hidden="true" />
            <h3>{!items.length ? '行囊还是空的' : '当前分类暂无物品'}</h3>
            <p>{!items.length ? '可前往补给铺挑选物品。' : '试试其他分类，或继续向下浏览。'}</p>
          </div>
        )}
        {pagination}
      </ScrollArea>
      {selected && (
        <section className={styles.details} aria-label="选中物品详情">
          <div className={styles.itemTitle}>
            <ItemIcon
              url={selected.icon}
              name={selected.name}
              level={selected.slot ? selected.level : 0}
            />
            <div>
              <h3>{selected.name}</h3>
              <small>
                {equipmentSlots[selected.slot] || '物品'} · 品质 {selected.rarity}
              </small>
            </div>
          </div>
          <dl className={styles.stats}>
            {selected.stats.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{formatPetStat(label, value)}</dd>
              </div>
            ))}
          </dl>
          <div className={styles.actions}>
            <Button variant="secondary" onClick={onManage}>
              详情
            </Button>
            {selected.slot && (
              <Button disabled={pending || equipped(selected)} onClick={() => onEquip(selected.id)}>
                <Shirt size={15} aria-hidden="true" />
                {equipped(selected) ? '已穿戴' : '穿戴'}
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
