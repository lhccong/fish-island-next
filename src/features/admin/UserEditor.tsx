import { useState } from 'react';
import type { AdminPort, AdminUser } from '@/domain/admin';
import { EditorFrame, type EditorProps } from './EditorFrame';
import { Field, TextField, Choice } from './fields';
import { roles } from './options';
export function UserEditor({
  port,
  user,
  ...props
}: EditorProps & { port: AdminPort; user?: AdminUser }) {
  const [value, setValue] = useState(
    user ?? { id: '', name: '', account: '', avatar: '', profile: '', role: 'user' },
  );
  const update = (key: keyof typeof value, v: string) => setValue((s) => ({ ...s, [key]: v }));
  return (
    <EditorFrame
      {...props}
      title={user ? '修改用户' : '新建用户'}
      onSubmit={(s) => port.saveUser(value, s)}
    >
      <Field
        label="账号"
        required
        disabled={!!user}
        value={value.account}
        onChange={(e) => update('account', e.target.value)}
      />
      <Field
        label="用户名"
        required
        maxLength={64}
        value={value.name}
        onChange={(e) => update('name', e.target.value)}
      />
      <Field
        label="头像地址"
        type="url"
        value={value.avatar}
        onChange={(e) => update('avatar', e.target.value)}
      />
      {user && (
        <TextField
          label="简介"
          value={value.profile}
          onChange={(e) => update('profile', e.target.value)}
        />
      )}
      <Choice label="角色" value={value.role} options={roles} onChange={(v) => update('role', v)} />
    </EditorFrame>
  );
}
