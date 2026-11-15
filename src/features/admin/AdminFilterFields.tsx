import type { AdminCollection, AdminFilter } from '@/domain/admin';
import { Field, Choice } from './fields';
import { categories, reportStatuses } from './options';
import { UserQueryFields } from './UserQueryFields';
import { EquipmentQueryFields } from './EquipmentQueryFields';
export function AdminFilterFields({
  section,
  value,
  onChange,
  expanded,
}: {
  section: AdminCollection;
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
  if (section === 'user') return <UserQueryFields value={value} onChange={onChange} />;
  if (section === 'equipment')
    return <EquipmentQueryFields value={value} onChange={onChange} expanded={expanded} />;
  if (section === 'report')
    return (
      <>
        <Choice
          label="举报类型"
          value={String(value.reportType ?? 'all')}
          options={[
            { value: 'all', label: '全部' },
            { value: '1', label: '聊天记录' },
            { value: '2', label: '帖子' },
            { value: '3', label: '鱼小圈' },
          ]}
          onChange={(v) => set('reportType', v)}
        />
        <Field
          label="举报人"
          inputMode="numeric"
          pattern="[0-9]*"
          value={String(value.reporterId ?? '')}
          onChange={(e) => set('reporterId', e.target.value)}
        />
        <Field
          label="被举报用户"
          inputMode="numeric"
          pattern="[0-9]*"
          value={String(value.targetUserId ?? '')}
          onChange={(e) => set('targetUserId', e.target.value)}
        />
        <Choice
          label="处理状态"
          value={String(value.status ?? 'all')}
          options={[{ value: 'all', label: '全部' }, ...reportStatuses]}
          onChange={(v) => set('status', v)}
        />
      </>
    );
  return (
    <>
      <Field
        label={section === 'title' ? 'ID' : 'id'}
        inputMode="numeric"
        pattern="[0-9]*"
        value={String(value[section === 'title' ? 'titleId' : 'id'] ?? '')}
        onChange={(e) => set(section === 'title' ? 'titleId' : 'id', e.target.value)}
      />
      {section === 'title' ? (
        <Field
          label="称号名称"
          value={String(value.name ?? '')}
          onChange={(e) => set('name', e.target.value)}
        />
      ) : section === 'tags' ? (
        <>
          <Field
            label="标签名称"
            value={String(value.tagsName ?? '')}
            onChange={(e) => set('tagsName', e.target.value)}
          />
          <Choice
            label="类型"
            value={String(value.type ?? 'all')}
            options={[
              { value: 'all', label: '全部' },
              { value: '0', label: '官方创建' },
              { value: '1', label: '用户自定义' },
            ]}
            onChange={(v) => set('type', v)}
          />
        </>
      ) : (
        <>
          <Field
            label="单词"
            value={String(value.word ?? '')}
            onChange={(e) => set('word', e.target.value)}
          />
          <Choice
            label="分类"
            value={String(value.category ?? 'all')}
            options={[{ value: 'all', label: '全部' }, ...categories]}
            onChange={(v) => set('category', v)}
          />
          <Field
            label="类型"
            value={String(value.wordType ?? '')}
            onChange={(e) => set('wordType', e.target.value)}
          />
        </>
      )}
    </>
  );
}
