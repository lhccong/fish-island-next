import { useCallback, useEffect, useState } from 'react';
import type { AdminPort, AdminTitle, AdminUser } from '@/domain/admin';
import { isAssignableTitle } from '@/domain/admin';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { InfiniteScroll, useInfinitePages } from '@/shared/ui/InfiniteScroll';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import type { EditorProps } from './EditorFrame';
import { useAdminMutation } from './use-admin-mutation';
import styles from './Admin.module.css';
import { AdminTable } from './AdminTable';
export function UserTitles({
  port,
  user,
  onClose,
  returnFocusRef,
}: Omit<EditorProps, 'onSaved'> & { port: AdminPort; user: AdminUser }) {
  const [owned, setOwned] = useState<AdminTitle[] | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const mutation = useAdminMutation();
  useEffect(() => {
    const c = new AbortController();
    void port
      .userTitles(user.id, c.signal)
      .then((v) => {
        if (!c.signal.aborted) setOwned(v);
      })
      .catch((e: unknown) => {
        if (!c.signal.aborted) setError(e instanceof Error ? e.message : '称号加载失败');
      });
    return () => c.abort();
  }, [port, user.id, revision]);
  const load = useCallback(
    (page: number, s: AbortSignal) =>
      port.list(
        'title',
        page,
        search ? (/^\d+$/.test(search) ? { titleId: search } : { name: search }) : {},
        s,
      ),
    [port, search],
  );
  const pages = useInfinitePages(load);
  const change = (id: string, assign: boolean) => {
    void mutation.run(
      async (s) => {
        await port.assignTitle(user.id, id, assign, s);
        const v = await port.userTitles(user.id, s);
        if (!s.aborted) setOwned(v);
      },
      () => {},
    );
  };
  return (
    <Dialog
      open
      title="用户称号"
      description={user.name || user.account}
      dismissLabel="关闭用户称号"
      showCloseAction={false}
      className={`${styles.dialog} ${styles.titleDialog}`}
      {...(returnFocusRef ? { returnFocusRef } : {})}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <ScrollArea label="用户称号列表" gutter="reserved" className={styles.body ?? ''}>
        <div className={styles.grid}>
          {error ? (
            <div className={styles.full}>
              <p role="alert">{error}</p>
              <Button
                onClick={() => {
                  setError('');
                  setRevision((n) => n + 1);
                }}
              >
                重试用户称号
              </Button>
            </div>
          ) : !owned ? (
            <LoadingIndicator>正在加载用户称号…</LoadingIndicator>
          ) : (
            <section className={styles.full}>
              <h2 className={styles.heading}>已拥有</h2>
              {!owned.some((t) => isAssignableTitle(t.id)) && <p>该用户暂无称号</p>}
              <AdminTable
                section="title"
                columns={[
                  { key: 'id', label: '称号ID', render: (t) => t.id },
                  { key: 'name', label: '称号名称', render: (t) => t.name, primary: true },
                ]}
                items={owned.filter((t) => isAssignableTitle(t.id))}
                sort={{}}
                onSort={() => {}}
                actions={(t) => (
                  <Button
                    variant="secondary"
                    disabled={mutation.pending}
                    onClick={() => change(t.id, false)}
                  >
                    移除 {t.name}
                  </Button>
                )}
              />
            </section>
          )}
          <section className={styles.full}>
            <div className={styles.titleToolbar}>
              <h2 className={styles.heading}>可分配称号</h2>
              <form
                className={`${styles.field} ${styles.titleSearch}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearch(draft.trim());
                }}
              >
                <input
                  aria-label="搜索称号 ID 或名称"
                  placeholder="搜索称号 ID 或名称"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <Button type="submit">查询</Button>
              </form>
            </div>
            {pages.result.status === 'loading' ? (
              <LoadingIndicator>正在加载称号…</LoadingIndicator>
            ) : pages.result.status === 'error' ? (
              <>
                <p role="alert">{pages.result.message}</p>
                <Button onClick={pages.refresh}>重试称号</Button>
              </>
            ) : (
              <>
                {!pages.result.data.items.some((t) => isAssignableTitle(t.id)) && (
                  <p>没有匹配的称号</p>
                )}
                <AdminTable
                  section="title"
                  columns={[
                    { key: 'id', label: '称号ID', render: (t) => t.id },
                    { key: 'name', label: '称号名称', render: (t) => t.name, primary: true },
                    {
                      key: 'status',
                      label: '状态',
                      render: (t) => (owned?.some((o) => o.id === t.id) ? '已拥有' : '未拥有'),
                    },
                  ]}
                  items={pages.result.data.items.filter((t) => isAssignableTitle(t.id))}
                  sort={{}}
                  onSort={() => {}}
                  actions={(t) => (
                    <Button
                      disabled={!owned || mutation.pending || owned.some((o) => o.id === t.id)}
                      onClick={() => change(t.id, true)}
                    >
                      {owned?.some((o) => o.id === t.id) ? '已拥有' : `分配 ${t.name}`}
                    </Button>
                  )}
                />
                <InfiniteScroll
                  label="称号"
                  hasMore={pages.hasMore}
                  loading={pages.loadingMore}
                  error={pages.error}
                  onLoadMore={pages.loadMore}
                />
              </>
            )}
          </section>
        </div>
      </ScrollArea>
      {mutation.pending && <LoadingIndicator compact>正在更新称号…</LoadingIndicator>}
      {mutation.error && <p role="alert">{mutation.error}</p>}
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose}>
          关闭
        </Button>
      </div>
    </Dialog>
  );
}
