import type { AdminPort } from '@/domain/admin';
import { EquipmentEditor } from './EquipmentEditor';
import { itemCategories, rarities, slots, labelOf } from './options';
import { TableImage } from './TableImage';
import { AdminList } from './AdminList';
export function EquipmentList({ port }: { port: AdminPort }) {
  return (
    <AdminList
      port={port}
      section="equipment"
      columns={[
        { key: 'name', label: '物品名称', render: (v) => v.name, primary: true },
        { key: 'category', label: '物品大类', render: (v) => labelOf(itemCategories, v.category) },
        { key: 'subType', label: '物品子类型', render: (v) => labelOf(slots, v.subType || 'none') },
        {
          key: 'equipSlot',
          label: '可穿戴槽位',
          render: (v) => (v.equipSlot ? labelOf(slots, v.equipSlot) : '无法穿戴'),
        },
        {
          key: 'icon',
          label: '物品图标',
          render: (v) => <TableImage src={v.icon} name={v.name} />,
        },
        { key: 'rarity', label: '稀有度', render: (v) => labelOf(rarities, v.rarity) },
      ]}
      editor={(v, onClose, onSaved) => (
        <EquipmentEditor port={port} {...(v ? { equipment: v } : {})} {...{ onClose, onSaved }} />
      )}
    />
  );
}
