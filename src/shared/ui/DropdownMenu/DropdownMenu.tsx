import { Fragment, type ReactElement, type ReactNode, type RefObject } from 'react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import styles from './DropdownMenu.module.css';

export interface DropdownMenuItem {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  tone?: 'danger' | 'highlight';
  separatorBefore?: boolean;
}
interface Props {
  className?: string;
  trigger: ReactElement;
  label: string;
  items: readonly DropdownMenuItem[];
  returnFocusRef?: RefObject<HTMLElement | null>;
  onCloseFocus?: () => void;
  presentation?: 'default' | 'account' | 'chat-tools';
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}

export function DropdownMenu({
  trigger,
  label,
  items,
  className = '',
  returnFocusRef,
  onCloseFocus,
  presentation = 'default',
  side = 'bottom',
  align = 'end',
}: Props) {
  return (
    <Dropdown.Root modal={false}>
      <Dropdown.Trigger asChild>{trigger}</Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          className={`${styles.menu} ${className}`}
          aria-label={label}
          data-presentation={presentation}
          side={side}
          align={align}
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
            <Fragment key={item.label}>
              {item.separatorBefore && <Dropdown.Separator className={styles.separator} />}
              <Dropdown.Item
                className={styles.item}
                disabled={item.disabled}
                data-tone={item.tone}
                onSelect={item.onSelect}
              >
                {item.icon}
                {item.label}
              </Dropdown.Item>
            </Fragment>
          ))}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
