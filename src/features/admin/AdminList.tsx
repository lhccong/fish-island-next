import { useCallback, useRef, useState, type ReactNode } from 'react';
import type { AdminCollection, AdminEntities, AdminFilter, AdminPort } from '@/domain/admin';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { InfiniteScroll, useInfinitePages } from '@/shared/ui/InfiniteScroll';
import { AdminFilters } from './AdminFilters';
import { EditorFrame } from './EditorFrame';
import styles from './Admin.module.css';
import { AdminTable } from './AdminTable';
import type { AdminColumn } from './table-types';
interface Props<K extends AdminCollection> {
  section: K;
  port: AdminPort;
  initial?: AdminFilter;
  columns: readonly AdminColumn<AdminEntities[K]>[];
  editor?: (item: AdminEntities[K] | null, close: () => void, saved: () => void) => ReactNode;
  extra?: (item: AdminEntities[K], refresh: () => void) => ReactNode;
}
export function AdminList<K extends AdminCollection>({
  section,
  port,
  initial = {},
  columns,
  editor,
  extra,
}: Props<K>) {
  const [filter, setFilter] = useState(initial);
  const load = useCallback(
    (page: number, signal: AbortSignal) => port.list(section, page, filter, signal),
    [port, section, filter],
  );
  const pages = useInfinitePages(load);
  const [editing, setEditing] = useState<{ item: AdminEntities[K] | null } | null>(null);
  const [removing, setRemoving] = useState<AdminEntities[K] | null>(null);
  const [notice, setNotice] = useState('');
  const origin = useRef<HTMLElement | null>(null);
  function saved() {
    setEditing(null);
    setRemoving(null);
    setNotice('操作成功');
    pages.refresh();
  }
  return (
    <div className={styles.workspace}>
      <AdminFilters section={section} initial={initial} onSearch={setFilter} />
      <section className={styles.tablePanel}>
        <div className={styles.tableToolbar}>
          <h2>
            {section === 'title'
              ? '称号管理'
              : section === 'word'
                ? '词库管理'
                : section === 'report'
                  ? '举报管理'
                  : '查询表格'}
          </h2>
          <div className={styles.actions}>
            {editor && (
              <Button
                onClick={(e) => {
                  origin.current = e.currentTarget;
                  setEditing({ item: null });
                }}
              >
                新建
              </Button>
            )}
            <Button variant="secondary" onClick={pages.refresh}>
              刷新
            </Button>
          </div>
        </div>
        {notice && (
          <p role="status" className={styles.feedback}>
            {notice}
          </p>
        )}
        <AdminTable
          section={section}
          columns={columns}
          items={pages.result.status === 'ready' ? pages.result.data.items : []}
          sort={filter}
          onSort={(field) =>
            setFilter((s) => ({
              ...s,
              sortField: field,
              sortOrder: s.sortField === field && s.sortOrder === 'ascend' ? 'descend' : 'ascend',
            }))
          }
          feedback={
            pages.result.status === 'loading' ? (
              <LoadingIndicator>正在加载管理列表…</LoadingIndicator>
            ) : pages.result.status === 'error' ? (
              <div className={styles.empty}>
                <p role="alert">{pages.result.message}</p>
                <Button onClick={pages.refresh}>重试</Button>
              </div>
            ) : !pages.result.data.items.length ? (
              <div className={styles.empty}>
                暂无记录，可调整筛选条件{editor ? '或新建记录' : ''}
              </div>
            ) : undefined
          }
          actions={(item) => (
            <div className={styles.rowActions}>
              {editor && (
                <Button
                  variant="secondary"
                  onClick={(e) => {
                    origin.current = e.currentTarget;
                    setEditing({ item });
                  }}
                >
                  修改
                </Button>
              )}
              {extra?.(item, pages.refresh)}
              {section !== 'report' && (
                <Button
                  variant="secondary"
                  className={styles.danger ?? ''}
                  onClick={(e) => {
                    origin.current = e.currentTarget;
                    setRemoving(item);
                  }}
                >
                  删除
                </Button>
              )}
            </div>
          )}
        />
        {pages.result.status === 'ready' && (
          <InfiniteScroll
            hasMore={pages.hasMore}
            loading={pages.loadingMore}
            error={pages.error}
            onLoadMore={pages.loadMore}
            label="管理列表"
          />
        )}
      </section>
      {editing && editor?.(editing.item, () => setEditing(null), saved)}
      {removing && section !== 'report' && (
        <EditorFrame
          title="删除记录"
          submitLabel="确认删除"
          returnFocusRef={origin}
          onClose={() => setRemoving(null)}
          onSaved={saved}
          onSubmit={(s) => port.remove(section, removing.id, s)}
        >
          <p className={styles.full}>确定删除记录 {removing.id}？此操作无法撤销。</p>
        </EditorFrame>
      )}
    </div>
  );
}
