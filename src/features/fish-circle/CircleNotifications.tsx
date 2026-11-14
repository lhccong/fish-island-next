import { InfiniteScroll } from '@/shared/ui/InfiniteScroll';
import { useCallback, useRef, useState, type CSSProperties } from 'react';
import { Bell, CheckCheck, RefreshCw, Trash2, MoreHorizontal } from 'lucide-react';
import type { CircleReminder, FishCirclePort } from '@/domain/fish-circle';
import { DropdownMenu } from '@/shared/ui/DropdownMenu';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import { NotificationBadge, useNotifications } from './notifications';
import { NotificationRow } from './NotificationRow';
import { usePage } from './use-page';
import { useOperation } from './use-operation';
import styles from './CircleNotifications.module.css';
interface Props {
  service: FishCirclePort;
  onViewDetail: (reminder: CircleReminder, trigger: HTMLButtonElement | null) => void;
}
export function CircleNotifications({ service, onViewDetail }: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 100, right: 24 });
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteAll, setDeleteAll] = useState(false);
  const [ids, setIds] = useState<string[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const load = useCallback(
    (p: number, signal: AbortSignal) => service.reminders(p, signal),
    [service],
  );
  const { result, refresh, loadMore, loadingMore, error: pageError, hasMore } = usePage(load);
  const { run, pending, error } = useOperation();
  const notifications = useNotifications();
  const items = result.status === 'ready' ? result.data.items : [];
  const unread = items.filter((item) => !item.read && !readIds.includes(item.id));
  async function markRead(targets: string[]) {
    if (!targets.length) return true;
    const done = await run((signal) => service.reminderAction('read', targets, signal));
    if (done) {
      setReadIds((current) => [...new Set([...current, ...targets])]);
      notifications.refresh();
    }
    return done === true;
  }
  function select(item: CircleReminder) {
    setOpen(false);
    onViewDetail(item, triggerRef.current);
    if (!item.read && !readIds.includes(item.id)) void markRead([item.id]);
  }
  return (
    <>
      <Dialog
        modal={false}
        returnFocusRef={triggerRef}
        hideDescription
        style={
          {
            '--notification-top': `${position.top}px`,
            '--notification-right': `${position.right}px`,
          } as CSSProperties
        }
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (value) {
            refresh();
            notifications.refresh();
          }
          setDeleting(false);
          setDeleteAll(false);
          setIds([]);
        }}
        trigger={
          <button
            type="button"
            ref={triggerRef}
            aria-label="消息通知"
            title="消息通知"
            className={styles.bell}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setPosition({
                top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 460)),
                right: Math.max(12, window.innerWidth - rect.right),
              });
            }}
          >
            <Bell size={19} aria-hidden="true" />
            <NotificationBadge />
          </button>
        }
        title="全部互动消息"
        description="点赞、评论和提及"
        className={styles.panel || ''}
        showCloseAction={false}
        dismissLabel="关闭消息通知"
      >
        <div className={styles.more}>
          <DropdownMenu
            label="通知操作"
            className={styles.menu || ''}
            trigger={
              <button
                type="button"
                aria-label="更多通知操作"
                className={styles.iconButton}
                title="更多通知操作"
                disabled={pending || result.status === 'loading'}
              >
                <MoreHorizontal size={19} aria-hidden="true" />
              </button>
            }
            items={[
              {
                label: '刷新消息通知',
                icon: <RefreshCw size={16} aria-hidden="true" />,
                disabled: pending || result.status === 'loading',
                onSelect: () => {
                  setNotice('');
                  refresh();
                  notifications.refresh();
                },
              },
              {
                label: '全部已读',
                icon: <CheckCheck size={16} aria-hidden="true" />,
                disabled: pending || notifications.count === 0,
                onSelect: () => {
                  setNotice('');
                  void run((signal) => service.allReminderAction('read', signal)).then((done) => {
                    if (done) {
                      setReadIds((current) => [
                        ...new Set([...current, ...unread.map((item) => item.id)]),
                      ]);
                      setNotice('全部消息已标为已读');
                      refresh();
                      notifications.refresh();
                    }
                  });
                },
              },
              {
                label: '全部删除',
                icon: <Trash2 size={16} aria-hidden="true" />,
                tone: 'danger',
                disabled: pending || (result.status === 'ready' && result.data.total === 0),
                onSelect: () => {
                  setNotice('');
                  setDeleting(false);
                  setDeleteAll(true);
                },
              },
              {
                label: deleting ? '取消删除' : '管理',
                icon: <Trash2 size={16} aria-hidden="true" />,
                disabled: pending || !items.length,
                onSelect: () => {
                  setDeleting(!deleting);
                  setDeleteAll(false);
                  setIds([]);
                },
              },
            ]}
          />
        </div>
        {error && <p role="alert">{error}</p>}
        {notifications.error && <p role="alert">未读数暂不可用，刷新消息通知可重试。</p>}
        {pending && <p role="status">正在处理通知…</p>}
        {notice && <p role="status">{notice}</p>}
        {(deleting || deleteAll) && (
          <div className={styles.confirm}>
            <span>
              {deleteAll
                ? '删除全部通知？包含未加载消息，删除后无法恢复。'
                : `删除所选 ${ids.length} 条通知？`}
            </span>
            <div className={styles.confirmActions}>
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => {
                  setDeleteAll(false);
                  setDeleting(false);
                  setIds([]);
                }}
              >
                取消
              </Button>
              <Button
                disabled={pending || (!deleteAll && !ids.length)}
                onClick={() => {
                  setNotice('');
                  void run((signal) =>
                    deleteAll
                      ? service.allReminderAction('delete', signal)
                      : service.reminderAction('delete', ids, signal),
                  ).then((done) => {
                    if (done) {
                      setDeleting(false);
                      setDeleteAll(false);
                      setIds([]);
                      setReadIds([]);
                      setNotice('通知已删除');
                      refresh();
                      notifications.refresh();
                    }
                  });
                }}
              >
                确认删除
              </Button>
            </div>
          </div>
        )}
        <ScrollArea label="互动消息列表" gutter="reserved" className={styles.list || ''}>
          <div className={styles.entries}>
            {result.status === 'loading' && (
              <p className={styles.state} role="status">
                正在加载消息通知…
              </p>
            )}
            {result.status === 'error' && (
              <div className={styles.state} role="alert">
                <p>{result.message}</p>
                <Button variant="secondary" onClick={refresh}>
                  重试通知
                </Button>
              </div>
            )}
            {result.status === 'ready' && !items.length && (
              <p className={styles.state}>暂无互动消息</p>
            )}
            {items.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                deleting={deleting}
                disabled={pending}
                selected={ids.includes(item.id)}
                unread={!item.read && !readIds.includes(item.id)}
                onSelected={(checked) =>
                  setIds(checked ? [...ids, item.id] : ids.filter((id) => id !== item.id))
                }
                onOpen={() => select(item)}
              />
            ))}
            {result.status === 'ready' && (
              <InfiniteScroll
                enabled={open && !pending}
                label="通知"
                hasMore={hasMore}
                loading={loadingMore}
                error={pageError}
                onLoadMore={loadMore}
              />
            )}
          </div>
        </ScrollArea>
      </Dialog>
    </>
  );
}
