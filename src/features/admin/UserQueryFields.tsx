import type { AdminFilter } from '@/domain/admin';
import { Field, Choice } from './fields';
import { roles } from './options';
import { UserDateFilters } from './UserDateFilters';
export function UserQueryFields({
  value,
  onChange,
}: {
  value: AdminFilter;
  onChange: (v: AdminFilter) => void;
}) {
  const set = (k: string, v: string) => {
    const next = { ...value };
    if (v && v !== 'all') next[k] = v;
    else delete next[k];
    onChange(next);
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
        label="账号"
        value={String(value.userAccount ?? '')}
        onChange={(e) => set('userAccount', e.target.value)}
      />
      <Field
        label="用户名"
        value={String(value.userName ?? '')}
        onChange={(e) => set('userName', e.target.value)}
      />
      <Field
        label="简介"
        value={String(value.userProfile ?? '')}
        onChange={(e) => set('userProfile', e.target.value)}
      />
      <Choice
        label="权限"
        value={String(value.userRole ?? 'all')}
        options={[{ value: 'all', label: '全部' }, ...roles]}
        onChange={(v) => set('userRole', v)}
      />
      <UserDateFilters value={value} onChange={onChange} />
    </>
  );
}
