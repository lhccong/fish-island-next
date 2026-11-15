import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { AdminCollection, AdminFilter } from '@/domain/admin';
import type { AdminColumn } from './table-types';
import styles from './AdminTable.module.css';
export function AdminTable<T extends { id: string }>({
  section,
  columns,
  items,
  sort,
  onSort,
  actions,
  feedback,
}: {
  section: AdminCollection;
  columns: readonly AdminColumn<T>[];
  items: readonly T[];
  sort: AdminFilter;
  onSort: (field: string) => void;
  actions: (item: T) => ReactNode;
  feedback?: ReactNode;
}) {
  return (
    <div
      className={styles.viewport}
      role="region"
      aria-label="管理表格横向滚动区"
      tabIndex={0}
      data-section={section}
    >
      <table className={styles.table} aria-label="管理记录" data-section={section}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={c.width ? { width: c.width } : undefined}
                aria-sort={
                  c.sortField && sort.sortField === c.sortField
                    ? sort.sortOrder === 'ascend'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                {c.sortField ? (
                  <button
                    type="button"
                    onClick={() => onSort(c.sortField!)}
                    aria-label={`按${c.label}排序`}
                  >
                    {c.label}
                    {sort.sortField === c.sortField ? (
                      sort.sortOrder === 'ascend' ? (
                        <ArrowUp size={14} aria-hidden="true" />
                      ) : (
                        <ArrowDown size={14} aria-hidden="true" />
                      )
                    ) : (
                      <ChevronsUpDown size={14} aria-hidden="true" />
                    )}
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
            <th scope="col" className={styles.actionColumn}>
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {feedback ? (
            <tr>
              <td colSpan={columns.length + 1} className={styles.feedback}>
                {feedback}
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} data-admin-record={item.id} aria-label={`记录 ${item.id}`}>
                {columns.map((c) => (
                  <td key={c.key} data-label={c.label} data-primary={c.primary}>
                    <div className={styles.cell}>{c.render(item) || '—'}</div>
                  </td>
                ))}
                <td data-actions className={styles.actionColumn}>
                  {actions(item)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
