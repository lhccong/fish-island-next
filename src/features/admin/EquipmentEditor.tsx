import { useState } from 'react';
import type { AdminEquipment, AdminPort } from '@/domain/admin';
import { EditorFrame, type EditorProps } from './EditorFrame';
import { Field, TextField, Choice } from './fields';
import { itemCategories, slots, rarities } from './options';
import styles from './Admin.module.css';
const attributes = [
  ['critRate', '暴击率'],
  ['comboRate', '连击率'],
  ['dodgeRate', '闪避率'],
  ['blockRate', '格挡率'],
  ['lifesteal', '吸血'],
  ['critResistance', '抗暴击'],
  ['comboResistance', '抗连击'],
  ['dodgeResistance', '抗闪避'],
  ['blockResistance', '抗格挡'],
  ['lifestealResistance', '抗吸血'],
] as const;
const baseFields = [
  ['baseAttack', '基础攻击力'],
  ['baseDefense', '基础防御力'],
  ['baseHp', '基础生命值'],
  ['baseSpeed', '基础速度'],
  ['levelReq', '使用等级'],
  ['removePoint', '分解积分'],
] as const;
export function EquipmentEditor({
  port,
  equipment,
  ...props
}: EditorProps & { port: AdminPort; equipment?: AdminEquipment }) {
  const [v, set] = useState<AdminEquipment>(
    equipment ?? {
      id: '',
      name: '',
      code: '',
      category: 'equipment',
      subType: '',
      equipSlot: '',
      icon: '',
      rarity: 1,
      levelReq: 1,
      baseAttack: 0,
      baseDefense: 0,
      baseHp: 0,
      baseSpeed: 0,
      stackable: 0,
      removePoint: 0,
      description: '',
      attributes: {},
    },
  );
  return (
    <EditorFrame
      {...props}
      title={equipment ? '修改装备' : '新建装备'}
      onSubmit={(s) => port.saveEquipment(v, s)}
    >
      <Field
        label="物品名称"
        required
        value={v.name}
        onChange={(e) => set({ ...v, name: e.target.value })}
      />
      <Field
        label="模板唯一码"
        required
        value={v.code}
        onChange={(e) => set({ ...v, code: e.target.value })}
      />
      <Choice
        label="物品大类"
        value={v.category}
        options={itemCategories}
        onChange={(category) => set({ ...v, category })}
      />
      <Choice
        label="物品子类型"
        value={v.subType || 'none'}
        options={slots}
        onChange={(subType) => set({ ...v, subType: subType === 'none' ? '' : subType })}
      />
      <Choice
        label="穿戴槽位"
        value={v.equipSlot || 'none'}
        options={slots}
        onChange={(equipSlot) => set({ ...v, equipSlot: equipSlot === 'none' ? '' : equipSlot })}
      />
      <Field
        label="物品图标地址"
        type="url"
        value={v.icon}
        onChange={(e) => set({ ...v, icon: e.target.value })}
      />
      <Choice
        label="稀有度"
        value={String(v.rarity)}
        options={rarities}
        onChange={(rarity) => set({ ...v, rarity: Number(rarity) })}
      />
      {baseFields.slice(0, 4).map(([key, label]) => (
        <Field
          key={key}
          label={label}
          type="number"
          required
          min={0}
          value={v[key]}
          onChange={(e) => set({ ...v, [key]: Number(e.target.value) })}
        />
      ))}
      <Field
        label="使用等级需求"
        type="number"
        required
        min={0}
        value={v.levelReq}
        onChange={(e) => set({ ...v, levelReq: Number(e.target.value) })}
      />
      <Choice
        label="是否可叠加"
        value={String(v.stackable)}
        options={[
          { value: '0', label: '不可叠加' },
          { value: '1', label: '可叠加' },
        ]}
        onChange={(stackable) => set({ ...v, stackable: Number(stackable) })}
      />
      <Field
        label="分解积分"
        type="number"
        required
        min={0}
        value={v.removePoint}
        onChange={(e) => set({ ...v, removePoint: Number(e.target.value) })}
      />
      <TextField
        label="物品描述"
        value={v.description}
        onChange={(e) => set({ ...v, description: e.target.value })}
      />
      {['主动属性', '抗性属性'].map((group, i) => (
        <section key={group} className={styles.attributeGroup}>
          <h3>{group}</h3>
          <div className={styles.attributeFields}>
            {attributes.slice(i * 5, i * 5 + 5).map(([key, label]) => (
              <Field
                key={key}
                label={`${label}（%）`}
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={(v.attributes[key] ?? 0) * 100}
                onChange={(e) =>
                  set({
                    ...v,
                    attributes: { ...v.attributes, [key]: Number(e.target.value) / 100 },
                  })
                }
              />
            ))}
          </div>
        </section>
      ))}
    </EditorFrame>
  );
}
