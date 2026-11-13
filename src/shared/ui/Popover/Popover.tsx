import type { ReactElement, ReactNode } from 'react';
import * as Primitive from '@radix-ui/react-popover';
import { X } from 'lucide-react';
import styles from './Popover.module.css';

export function Popover({
  open,
  onOpenChange,
  trigger,
  label,
  children,
  className = '',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactElement;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <Primitive.Trigger asChild>{trigger}</Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Content
          aria-label={label}
          side="top"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          sticky="always"
          hideWhenDetached
          className={`${styles.panel} ${className}`}
        >
          <div className={styles.header}>
            <span>{label}</span>
            <Primitive.Close className={styles.close} aria-label={`关闭${label}`}>
              <X size={18} aria-hidden="true" />
            </Primitive.Close>
          </div>
          {children}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
