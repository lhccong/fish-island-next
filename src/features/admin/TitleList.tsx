import type { AdminPort } from '@/domain/admin';
import { TitleEditor } from './TitleEditor';
import { AdminList } from './AdminList';
export function TitleList({ port }: { port: AdminPort }) {
  return (
    <AdminList
      port={port}
      section="title"
      columns={[
        { key: 'id', label: 'ID', render: (v) => v.id },
        { key: 'name', label: '称号名称', render: (v) => v.name, primary: true },
        {
          key: 'createdAt',
          label: '创建时间',
          render: (v) => v.createdAt,
          sortField: 'createTime',
        },
        {
          key: 'updatedAt',
          label: '更新时间',
          render: (v) => v.updatedAt,
          sortField: 'updateTime',
        },
      ]}
      editor={(v, onClose, onSaved) => (
        <TitleEditor port={port} {...(v ? { title: v } : {})} {...{ onClose, onSaved }} />
      )}
    />
  );
}
