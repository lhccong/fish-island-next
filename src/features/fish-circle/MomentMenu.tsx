import type { RefObject } from 'react';
import { EllipsisVertical, Gift, Trophy, Pencil, Trash2, Pin } from 'lucide-react';
import type { MomentAction } from '@/domain/fish-circle';
import { DropdownMenu } from '@/shared/ui/DropdownMenu';
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
  return (
    <DropdownMenu
      label="动态操作"
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
      items={[
        {
          label: owner ? '发起抽奖' : '打赏',
          icon: owner ? (
            <Trophy size={14} aria-hidden="true" />
          ) : (
            <Gift size={14} aria-hidden="true" />
          ),
          disabled: pending,
          onSelect: () => onAction(owner ? 'lottery/start' : 'reward'),
        },
        ...(admin
          ? [
              {
                label: top ? '取消置顶' : '置顶动态',
                icon: <Pin size={14} aria-hidden="true" />,
                tone: 'highlight' as const,
                disabled: pending,
                onSelect: onToggleTop,
              },
            ]
          : []),
        ...(owner || admin
          ? [
              {
                label: '修改',
                icon: <Pencil size={14} aria-hidden="true" />,
                disabled: pending,
                onSelect: onEdit,
              },
              {
                label: '删除',
                icon: <Trash2 size={14} aria-hidden="true" />,
                tone: 'danger' as const,
                disabled: pending,
                onSelect: () => onAction('delete'),
              },
            ]
          : []),
      ]}
    />
  );
}
