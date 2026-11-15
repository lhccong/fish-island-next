import { useState } from 'react';
import type { AdminCollection, AdminFilter } from '@/domain/admin';
import { Button } from '@/shared/ui/Button';
import { Choice } from './fields';
import { AdminFilterFields } from './AdminFilterFields';
import styles from './AdminFilters.module.css';
export function AdminFilters({
  section,
  initial = {},
  onSearch,
}: {
  section: AdminCollection;
  initial?: AdminFilter;
  onSearch: (v: AdminFilter) => void;
}) {
  const [value, setValue] = useState(initial);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      className={styles.query}
      aria-label="管理查询"
      onSubmit={(e) => {
        e.preventDefault();
        if (
          ['createTimeRange', 'updateTimeRange'].some(
            (k) =>
              Array.isArray(value[k]) && (value[k].some((d) => !d) || value[k][0]! > value[k][1]!),
          )
        ) {
          setError('请选择完整且有效的日期范围');
          return;
        }
        setError('');
        onSearch({
          ...value,
          ...(value.sortField ? { sortOrder: value.sortOrder ?? 'descend' } : {}),
        });
      }}
    >
      <AdminFilterFields section={section} value={value} onChange={setValue} expanded={expanded} />
      {section !== 'tags' && (
        <div className={styles.mobileSort}>
          <Choice
            label="排序"
            value={String(value.sortField ?? 'default')}
            options={[
              { value: 'default', label: '默认排序' },
              { value: 'createTime', label: '创建时间' },
              ...(section === 'report' ? [] : [{ value: 'updateTime', label: '更新时间' }]),
            ]}
            onChange={(v) =>
              setValue((s) => {
                const n = { ...s };
                if (v === 'default') delete n.sortField;
                else n.sortField = v;
                return n;
              })
            }
          />
          <Choice
            label="排序方向"
            value={String(value.sortOrder ?? 'descend')}
            options={[
              { value: 'descend', label: '降序' },
              { value: 'ascend', label: '升序' },
            ]}
            onChange={(v) => setValue((s) => ({ ...s, sortOrder: v }))}
          />
        </div>
      )}
      <div className={styles.actions}>
        <Button
          variant="secondary"
          onClick={() => {
            setValue({});
            setError('');
            onSearch({});
          }}
        >
          重置
        </Button>
        <Button type="submit">查询</Button>
        {section === 'equipment' && (
          <Button
            variant="secondary"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? '收起' : '展开'}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </form>
  );
}
