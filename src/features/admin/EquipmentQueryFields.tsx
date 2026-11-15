import type { AdminFilter } from '@/domain/admin';
import { Field, Choice } from './fields';
import { itemCategories, slots, rarities } from './options';
export function EquipmentQueryFields({
  value,
  onChange,
  expanded,
}: {
  value: AdminFilter;
  onChange: (v: AdminFilter) => void;
  expanded: boolean;
}) {
  const set = (k: string, v: string) => {
    const n = { ...value };
    if (v && v !== 'all') n[k] = v;
    else delete n[k];
    onChange(n);
  };
  return (
    <>
      <Field
        label="id"
        inputMode="numeric"
        pattern="[0-9]*"
        value={String(value.id ?? '')}
        onChange={(e) => set('id', e.target.value)}
      />
      <Field
        label="物品名称"
        value={String(value.name ?? '')}
        onChange={(e) => set('name', e.target.value)}
      />
      <Field
        label="模板唯一码"
        value={String(value.code ?? '')}
        onChange={(e) => set('code', e.target.value)}
      />
      {expanded && (
        <>
          <Choice
            label="物品大类"
            value={String(value.category ?? 'all')}
            options={[{ value: 'all', label: '全部' }, ...itemCategories]}
            onChange={(v) => set('category', v)}
          />
          <Choice
            label="物品子类型"
            value={String(value.subType ?? 'all')}
            options={[{ value: 'all', label: '全部' }, ...slots.filter((s) => s.value !== 'none')]}
            onChange={(v) => set('subType', v)}
          />
          <Choice
            label="可穿戴槽位"
            value={String(value.equipSlot ?? 'all')}
            options={[{ value: 'all', label: '全部' }, ...slots.filter((s) => s.value !== 'none')]}
            onChange={(v) => set('equipSlot', v)}
          />
          <Choice
            label="稀有度"
            value={String(value.rarity ?? 'all')}
            options={[{ value: 'all', label: '全部' }, ...rarities]}
            onChange={(v) => set('rarity', v)}
          />
          <Field
            label="使用等级需求"
            type="number"
            min={0}
            value={String(value.levelReq ?? '')}
            onChange={(e) => set('levelReq', e.target.value)}
          />
          <Choice
            label="是否可叠加"
            value={String(value.stackable ?? 'all')}
            options={[
              { value: 'all', label: '全部' },
              { value: '0', label: '不可叠加' },
              { value: '1', label: '可叠加' },
            ]}
            onChange={(v) => set('stackable', v)}
          />
        </>
      )}
    </>
  );
}
