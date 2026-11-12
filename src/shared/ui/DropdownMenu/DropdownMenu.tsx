import type { ReactElement, ReactNode } from 'react';
import * as Dropdown from '@radix-ui/react-dropdown-menu';
import styles from './DropdownMenu.module.css';

interface Props {
  className?: string;
  trigger: ReactElement;
  label: string;
  items: readonly {
    label: string;
    icon: ReactNode;
    onSelect: () => void;
    disabled?: boolean;
    tone?: 'danger' | 'highlight';
  }[];
}

export function DropdownMenu({ trigger, label, items, className = '' }: Props) {
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
