import { useState } from 'react';
import type { AdminPort, AdminTag } from '@/domain/admin';
import { EditorFrame, type EditorProps } from './EditorFrame';
import { Field, Choice } from './fields';
const colors = [
  'magenta',
  'red',
  'volcano',
  'orange',
  'gold',
  'lime',
  'green',
  'cyan',
  'blue',
  'geekblue',
  'purple',
].map((value) => ({ value, label: value }));
export function TagEditor({
  port,
  tag,
  ...props
}: EditorProps & { port: AdminPort; tag?: AdminTag }) {
  const [v, set] = useState(tag ?? { id: '', name: '', color: 'blue', icon: '', type: 0, sort: 0 });
  return (
    <EditorFrame
      {...props}
      title={tag ? '修改标签' : '新建标签'}
      onSubmit={(s) => port.saveTag(v, s)}
    >
      <Field
        label="标签名称"
        required
        maxLength={64}
        value={v.name}
        onChange={(e) => set({ ...v, name: e.target.value })}
      />
      <Choice
        label="颜色"
        value={v.color}
        options={colors}
        onChange={(color) => set({ ...v, color })}
      />
      <Field label="图标" value={v.icon} onChange={(e) => set({ ...v, icon: e.target.value })} />
      <Choice
        label="类型"
        value={String(v.type)}
        options={[
          { value: '0', label: '官方创建' },
          { value: '1', label: '用户自定义' },
        ]}
        onChange={(type) => set({ ...v, type: Number(type) })}
      />
      <Field
        label="排序"
        type="number"
        required
        value={v.sort}
        onChange={(e) => set({ ...v, sort: Number(e.target.value) })}
      />
    </EditorFrame>
  );
}
