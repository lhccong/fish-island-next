import type { AdminPort } from '@/domain/admin';
import { TagEditor } from './TagEditor';
import styles from './Admin.module.css';
import { AdminList } from './AdminList';
export function TagList({ port }: { port: AdminPort }) {
  return (
    <AdminList
      port={port}
      section="tags"
      columns={[
        { key: 'id', label: 'id', render: (v) => v.id },
        { key: 'name', label: '标签名称', render: (v) => v.name, primary: true },
        {
          key: 'color',
          label: '颜色',
          render: (v) => <span className={styles.tag}>{v.color}</span>,
        },
        { key: 'icon', label: '图标', render: (v) => v.icon },
        { key: 'type', label: '类型', render: (v) => (v.type === 0 ? '官方创建' : '用户自定义') },
        { key: 'sort', label: '排序', render: (v) => String(v.sort) },
      ]}
      editor={(v, onClose, onSaved) => (
        <TagEditor port={port} {...(v ? { tag: v } : {})} {...{ onClose, onSaved }} />
      )}
    />
  );
}
