import { MoreHorizontal, Quote, Repeat2, Undo2, Flag } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { DropdownMenu, type DropdownMenuItem } from '@/shared/ui/DropdownMenu';
import type { RefObject } from 'react';
import styles from './MessageMenu.module.css';

export type MessageAction = DropdownMenuItem & {
  shortcut?: 'repeat' | 'quote' | 'report' | 'revoke';
};
const shortcuts = [
  {
    id: 'revoke',
    name: '撤回',
    icon: Undo2,
    reason: '仅本人或管理员可撤回；红包和福袋仅管理员可撤回',
  },
  { id: 'quote', name: '引用', icon: Quote, reason: '' },
  { id: 'report', name: '举报', icon: Flag, reason: '不能举报自己的消息' },
  { id: 'repeat', name: '复读', icon: Repeat2, reason: '红包和福袋不能复读' },
] as const;
export function MessageActionBar({
  items,
  returnFocusRef,
  onCloseFocus,
  onAction,
}: {
  items: readonly MessageAction[];
  returnFocusRef: RefObject<HTMLElement | null>;
  onCloseFocus: () => void;
  onAction: (item: MessageAction) => void;
}) {
  return (
    <div className={styles.toolbar} data-message-actions="true">
      {shortcuts.map(({ id, name, icon: Icon, reason }) => {
        const item = items.find((action) => action.shortcut === id);
        return (
          <span
            key={id}
            title={!item ? reason : item.disabled ? `${item.label}（当前不可用）` : name}
          >
            <Button
              variant="secondary"
              className={styles.action}
              aria-label={name}
              disabled={!item || item.disabled}
              onClick={() => {
                if (item) onAction(item);
              }}
            >
              <Icon size={14} aria-hidden="true" />
            </Button>
          </span>
        );
      })}
      <DropdownMenu
        label="消息操作"
        items={items}
        returnFocusRef={returnFocusRef}
        onCloseFocus={onCloseFocus}
        trigger={
          <Button variant="secondary" className={styles.more} aria-label="更多消息操作">
            <MoreHorizontal size={14} aria-hidden="true" />
          </Button>
        }
      />
    </div>
  );
}
