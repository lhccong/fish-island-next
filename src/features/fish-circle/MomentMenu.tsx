import { useState, type RefObject } from 'react';
import { EllipsisVertical, Gift, Trophy, Pencil, Trash2, Pin } from 'lucide-react';
import type { MomentAction } from '@/domain/fish-circle';
import { Dialog } from '@/shared/ui/Dialog';
import styles from './MomentMenu.module.css';
interface Props {
  triggerRef: RefObject<HTMLButtonElement | null>;
  owner: boolean;
  admin: boolean;
  top: boolean;
  pending: boolean;
  onEdit: () => void;
  onAction: (action: MomentAction) => void;
  onToggleTop: () => void;
}
export function MomentMenu({
  triggerRef,
  owner,
  admin,
  top,
  pending,
  onEdit,
  onAction,
  onToggleTop,
}: Props) {
  const [open, setOpen] = useState(false);
  function select(action: () => void) {
    setOpen(false);
    action();
  }
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="动态操作"
      description="选择要进行的操作"
      dismissLabel="关闭动态操作"
      showCloseAction={false}
      trigger={
        <button
          ref={triggerRef}
          className={styles.trigger}
          type="button"
          aria-label="更多动态操作"
          disabled={pending}
        >
          <EllipsisVertical size={16} aria-hidden="true" />
        </button>
      }
    >
      <div className={styles.menu}>
        {!owner && (
          <button type="button" onClick={() => select(() => onAction('reward'))}>
            <Gift size={18} aria-hidden="true" />
            打赏
          </button>
        )}
        {owner && (
          <button type="button" onClick={() => select(() => onAction('lottery/start'))}>
            <Trophy size={18} aria-hidden="true" />
            点赞抽奖
          </button>
        )}
        {(owner || admin) && (
          <>
            <button type="button" onClick={() => select(onEdit)}>
              <Pencil size={18} aria-hidden="true" />
              编辑动态
            </button>
            <button
              className={styles.danger}
              type="button"
              onClick={() => select(() => onAction('delete'))}
            >
              <Trash2 size={18} aria-hidden="true" />
              删除动态
            </button>
          </>
        )}
        {admin && (
          <button type="button" disabled={pending} onClick={() => select(onToggleTop)}>
            <Pin size={18} aria-hidden="true" />
            {top ? '取消置顶' : '置顶动态'}
          </button>
        )}
      </div>
    </Dialog>
  );
}
