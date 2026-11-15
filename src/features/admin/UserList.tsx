import type { AdminFilter, AdminPort } from '@/domain/admin';
import { UserEditor } from './UserEditor';
import { UserActions } from './UserActions';
import { roles, labelOf } from './options';
import { TableImage } from './TableImage';
import { AdminList } from './AdminList';
export function UserList({ port, initial }: { port: AdminPort; initial: AdminFilter }) {
  return (
    <AdminList
      port={port}
      section="user"
      initial={initial}
      columns={[
        { key: 'id', label: 'id', render: (v) => v.id, width: 100 },
        { key: 'account', label: '账号', render: (v) => v.account, width: 140 },
        { key: 'name', label: '用户名', render: (v) => v.name, primary: true, width: 140 },
        {
          key: 'avatar',
          label: '头像',
          render: (v) => <TableImage src={v.avatar} name={v.name} />,
          width: 96,
        },
        { key: 'profile', label: '简介', render: (v) => v.profile, width: 180 },
        { key: 'role', label: '权限', render: (v) => labelOf(roles, v.role), width: 100 },
        {
          key: 'createdAt',
          label: '注册时间',
          render: (v) => v.createdAt,
          sortField: 'createTime',
          width: 170,
        },
        {
          key: 'updatedAt',
          label: '更新时间',
          render: (v) => v.updatedAt,
          sortField: 'updateTime',
          width: 170,
        },
      ]}
      editor={(v, onClose, onSaved) => (
        <UserEditor port={port} {...(v ? { user: v } : {})} {...{ onClose, onSaved }} />
      )}
      extra={(v) => <UserActions port={port} user={v} />}
    />
  );
}
