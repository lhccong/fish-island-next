import { useRef, useState } from 'react';
import { Ellipsis, Pencil, Sparkles, Trash2 } from 'lucide-react';
import type { AuthUser } from '@/domain/auth';
import type { ForumPort, ForumPost } from '@/domain/forum';
import { DropdownMenu } from '@/shared/ui/DropdownMenu';
import { Dialog } from '@/shared/ui/Dialog';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useOperation } from './use-operation';
import { Toast } from '@/shared/ui/Toast';
import styles from './Forum.module.css';

export function ForumPostMenu({
  post,
  user,
  service,
  onEdit,
  onFeatured,
  onDeleted,
}: {
  post: ForumPost;
  user: AuthUser | null;
  service: ForumPort;
  onEdit: () => void;
  onFeatured: (featured: boolean) => void;
  onDeleted: () => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [remove, setRemove] = useState(false);
  const operation = useOperation();
  const canManage = Boolean(user && (user.id === post.authorId || user.role === 'admin'));
  if (!canManage) return null;
  return (
    <div className={styles.postMenu}>
      <DropdownMenu
        label="帖子操作"
        trigger={
          <button
            type="button"
            ref={trigger}
            className={styles.more}
            aria-label={`更多操作：${post.title}`}
            disabled={operation.busy}
          >
            <Ellipsis size={20} aria-hidden="true" />
          </button>
        }
        items={[
          { label: '编辑', icon: <Pencil size={16} aria-hidden="true" />, onSelect: onEdit },
          ...(user?.role === 'admin'
            ? [
                {
                  label: post.featured ? '取消精华' : '设为精华',
                  icon: <Sparkles size={16} aria-hidden="true" />,
                  onSelect: () => {
                    void operation.run(async (signal) => {
                      await service.feature(post.id, !post.featured, signal);
                      if (!signal.aborted) onFeatured(!post.featured);
                    }, '精华状态已更新');
                  },
                },
              ]
            : []),
          {
            label: '删除',
            icon: <Trash2 size={16} aria-hidden="true" />,
            tone: 'danger',
            separatorBefore: true,
            onSelect: () => setRemove(true),
          },
        ]}
      />
      {operation.busy && !remove && <Toast pending message="正在更新帖子…" />}
      {operation.message && !remove && <Toast message={operation.message} />}
      {remove && (
        <Dialog
          open
          title="删除帖子"
          description="确定删除这篇帖子吗？删除后无法恢复。"
          returnFocusRef={trigger}
          dismissLabel="关闭删除确认"
          showCloseAction={false}
          onOpenChange={(v) => {
            if (!operation.busy) setRemove(v);
          }}
        >
          <ScrollArea label="删除帖子确认" gutter="reserved">
            <p className={styles.dialogBody}>{post.title}</p>
          </ScrollArea>
          {operation.message && <p role="alert">{operation.message}</p>}
          <div className={styles.actions}>
            <Button variant="secondary" disabled={operation.busy} onClick={() => setRemove(false)}>
              取消
            </Button>
            <Button
              disabled={operation.busy}
              onClick={() =>
                void operation.run(async (signal) => {
                  await service.remove(post.id, signal);
                  if (!signal.aborted) {
                    const viewport = trigger.current?.closest<HTMLElement>(
                      '[data-radix-scroll-area-viewport]',
                    );
                    setRemove(false);
                    onDeleted();
                    viewport?.focus({ preventScroll: true });
                  }
                })
              }
            >
              {operation.busy ? <LoadingIndicator compact>正在删除…</LoadingIndicator> : '确认删除'}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
