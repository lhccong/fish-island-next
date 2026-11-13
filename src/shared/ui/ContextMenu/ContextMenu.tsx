import { useState, type ReactElement, type RefObject } from 'react';
import * as Context from '@radix-ui/react-context-menu';
import type { DropdownMenuItem } from '@/shared/ui/DropdownMenu';
import styles from './ContextMenu.module.css';

export function ContextMenu({
  children,
  label,
  items,
  disabled = false,
  returnFocusRef,
  onCloseFocus,
  className = '',
}: {
  children: ReactElement;
  label: string;
  items: readonly DropdownMenuItem[];
  disabled?: boolean;
  returnFocusRef: RefObject<HTMLElement | null>;
  onCloseFocus?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Context.Root open={open && !disabled} onOpenChange={setOpen} modal={false}>
      <Context.Trigger
        asChild
        disabled={disabled}
        onKeyDown={(event) => {
          if (disabled || (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')))
            return;
          event.preventDefault();
          const box = event.currentTarget.getBoundingClientRect();
          event.currentTarget.dispatchEvent(
            new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
              clientX: box.left + box.width / 2,
              clientY: box.top + Math.min(24, box.height) / 2,
            }),
          );
        }}
      >
        {children}
      </Context.Trigger>
      <Context.Portal>
        <Context.Content
          className={`${styles.menu} ${className}`}
          aria-label={label}
          collisionPadding={8}
          hideWhenDetached
          onCloseAutoFocus={(event) => {
            if (onCloseFocus) {
              event.preventDefault();
              onCloseFocus();
            } else if (returnFocusRef.current?.isConnected) {
              event.preventDefault();
              returnFocusRef.current.focus({ preventScroll: true });
            }
          }}
        >
          {items.map((item) => (
            <Context.Item
              key={item.label}
              className={styles.item}
              disabled={item.disabled}
              data-tone={item.tone}
              onSelect={item.onSelect}
            >
              {item.icon}
              {item.label}
            </Context.Item>
          ))}
        </Context.Content>
      </Context.Portal>
    </Context.Root>
  );
}
