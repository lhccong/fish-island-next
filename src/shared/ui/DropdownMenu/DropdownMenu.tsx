import type { ReactElement, ReactNode, RefObject } from 'react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import styles from './DropdownMenu.module.css';

export interface DropdownMenuItem {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  tone?: 'danger' | 'highlight';
}
interface Props {
  className?: string;
  trigger: ReactElement;
  label: string;
  items: readonly DropdownMenuItem[];
  returnFocusRef?: RefObject<HTMLElement | null>;
  onCloseFocus?: () => void;
}

export function DropdownMenu({
  trigger,
  label,
  items,
  className = '',
  returnFocusRef,
  onCloseFocus,
}: Props) {
  return (
    <Dropdown.Root modal={false}>
      <Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          className={`${styles.menu} ${className}`}
          aria-label={label}
          align="end"
          sideOffset={4}
          collisionPadding={8}
          sticky="always"
          hideWhenDetached
          onCloseAutoFocus={(event) => {
            if (onCloseFocus) {
              event.preventDefault();
              onCloseFocus();
            } else if (returnFocusRef?.current?.isConnected) {
              event.preventDefault();
              returnFocusRef.current.focus({ preventScroll: true });
            }
          }}
        >
          {items.map((item) => (
            <Dropdown.Item
              key={item.label}
              className={styles.item}
              disabled={item.disabled}
              data-tone={item.tone}
              onSelect={item.onSelect}
            >
              {item.icon}
              {item.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
