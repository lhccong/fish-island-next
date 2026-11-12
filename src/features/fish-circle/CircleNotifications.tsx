import { useCallback, useRef, useState, type CSSProperties } from 'react';
import {
  Bell,
  CheckCheck,
  Heart,
  MessageCircle,
  RefreshCw,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import type { AuthUser } from '@/domain/auth';
import type { CircleReminder, FishCirclePort } from '@/domain/fish-circle';
import { DropdownMenu } from '@/shared/ui/DropdownMenu';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { CircleAvatar } from './CircleAvatar';
import { ReminderDetail } from './ReminderDetail';
import { usePage } from './use-page';
import { useOperation } from './use-operation';
import { formatMomentTime } from './format-time';
import styles from './CircleNotifications.module.css';
interface Props {
  service: FishCirclePort;
  user: AuthUser;
  onViewUser: (id: string, name: string) => void;
}
export function CircleNotifications({ service, user, onViewUser }: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 100, right: 24 });
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CircleReminder | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [ids, setIds] = useState<string[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const load = useCallback(
    (p: number, signal: AbortSignal) => service.reminders(p, signal),
    [service],
  );
  const { result, page, setPage, refresh } = usePage(load);
  const { run, pending, error } = useOperation();
  const items = result.status === 'ready' ? result.data.items : [];
  const unread = items.filter((item) => !item.read && !readIds.includes(item.id));
  async function markRead(targets: string[]) {
    if (!targets.length) return true;
    const done = await run((signal) => service.reminderAction('read', targets, signal));
    if (done) setReadIds((current) => [...new Set([...current, ...targets])]);
    return done === true;
  }
  async function select(item: CircleReminder) {
    if (!item.read && !readIds.includes(item.id) && !(await markRead([item.id]))) return;
    setSelected(item);
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
          if (!value && selected) return;
          setOpen(value);
          if (value) refresh();
          setDeleting(false);
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
            {unread.length > 0 && <span className={styles.dot} aria-label="当前页有未读通知" />}
          </button>
        }
        title="全部互动消息"
        description="点赞、评论和提及 · 未读提示仅统计当前页"
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
                },
              },
              {
                label: '本页已读',
                icon: <CheckCheck size={16} aria-hidden="true" />,
                disabled: pending || !unread.length,
                onSelect: () => {
                  void markRead(unread.map((item) => item.id)).then((done) => {
                    if (done) setNotice('本页消息已标为已读');
                  });
                },
              },
              {
                label: deleting ? '取消删除' : '管理',
                icon: <Trash2 size={16} aria-hidden="true" />,
                disabled: pending || !items.length,
                onSelect: () => {
                  setDeleting(!deleting);
                  setIds([]);
                },
              },
            ]}
          />
        </div>
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        {deleting && (
          <div className={styles.confirm}>
            <span>删除所选 {ids.length} 条通知？</span>
            <button
              type="button"
              disabled={pending || !ids.length}
              onClick={() => {
                void run((signal) => service.reminderAction('delete', ids, signal)).then((done) => {
                  if (done) {
                    setDeleting(false);
                    setIds([]);
                    setNotice('通知已删除');
                    refresh();
                  }
                });
              }}
            >
              确认删除
            </button>
          </div>
        )}
        <ScrollArea label="互动消息列表" className={styles.list || ''}>
          {result.status === 'loading' && (
            <p className={styles.state} role="status">
              正在加载消息通知…
            </p>
          )}
          {result.status === 'error' && (
            <div className={styles.state} role="alert">
              <p>{result.message}</p>
              <button type="button" onClick={refresh}>
                重试通知
              </button>
            </div>
          )}
          {result.status === 'ready' && !items.length && (
            <p className={styles.state}>暂无互动消息</p>
          )}
          {items.map((item) => (
            <div className={styles.row} key={item.id}>
              {deleting && (
                <input
                  type="checkbox"
                  aria-label={`选择通知 ${item.id}`}
                  checked={ids.includes(item.id)}
                  onChange={(event) =>
                    setIds(
                      event.target.checked ? [...ids, item.id] : ids.filter((id) => id !== item.id),
                    )
                  }
                />
              )}
              <button
                type="button"
                className={styles.item}
                disabled={pending}
                onClick={() => {
                  void select(item);
                }}
              >
                <span className={styles.avatar}>
                  <CircleAvatar name={item.senderName} src={item.avatar} />
                </span>
                <span className={styles.body}>
                  <span className={styles.meta}>
                    <strong>
                      {item.senderName}
                      {!item.read && !readIds.includes(item.id) && (
                        <span className={styles.unread} aria-label="未读" />
                      )}
                    </strong>
                    <time>{formatMomentTime(item.createdAt)}</time>
                  </span>
                  <span className={styles.content}>
                    {item.action === 'like' ? (
                      <Heart size={17} aria-label="点赞" />
                    ) : (
                      <MessageCircle size={16} aria-hidden="true" />
                    )}
                    {item.action === 'like'
                      ? ''
                      : item.content || (item.action === 'mention' ? '提到了你' : '发来一条通知')}
                  </span>
                </span>
                {item.image && (
                  <img
                    className={styles.thumbnail}
                    src={item.image}
                    alt="通知图片"
                    referrerPolicy="no-referrer"
                  />
                )}
              </button>
            </div>
          ))}
        </ScrollArea>
        <div className={styles.pagination}>
          <button
            type="button"
            disabled={page === 1 || pending || result.status === 'loading'}
            onClick={() => {
              setIds([]);
              setPage(page - 1);
            }}
          >
            上一页通知
          </button>
          <span>第 {page} 页</span>
          <button
            type="button"
            disabled={pending || result.status !== 'ready' || page * 10 >= result.data.total}
            onClick={() => {
              setIds([]);
              setPage(page + 1);
            }}
          >
            下一页通知
          </button>
        </div>
      </Dialog>
      {selected && (
        <ReminderDetail
          reminder={selected}
          service={service}
          user={user}
          onClose={() => setSelected(null)}
          onViewUser={(id, name) => {
            setSelected(null);
            setOpen(false);
            onViewUser(id, name);
          }}
        />
      )}
    </>
  );
}
