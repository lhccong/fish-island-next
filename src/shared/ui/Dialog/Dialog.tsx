import { useRef, type ReactElement, type ReactNode } from 'react';
import { X } from 'lucide-react';
import * as Primitive from '@radix-ui/react-dialog';
import { Button } from '@/shared/ui/Button';
import styles from './Dialog.module.css';

interface DialogProps {
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showCloseAction?: boolean;
  dismissLabel?: string;
  illustration?: ReactNode;
  className?: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function Dialog({
  trigger,
  title,
  description,
  children,
  open,
  onOpenChange,
  showCloseAction = true,
  dismissLabel,
  illustration,
  className = '',
}: DialogProps) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Primitive.Root
      {...(open !== undefined ? { open } : {})}
      {...(onOpenChange ? { onOpenChange } : {})}
    >
      {trigger && <Primitive.Trigger asChild>{trigger}</Primitive.Trigger>}
      <Primitive.Portal>
        <Primitive.Overlay className={styles.overlay} />
        <Primitive.Content
          className={`${styles.content} ${className}`}
          onOpenAutoFocus={() => {
            returnFocus.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(event) => {
            if (!trigger && returnFocus.current?.isConnected) {
              event.preventDefault();
              returnFocus.current.focus();
            }
          }}
        >
          {dismissLabel && (
            <Primitive.Close asChild>
              <button className={styles.dismiss} type="button" aria-label={dismissLabel}>
                <X size={19} aria-hidden="true" />
              </button>
            </Primitive.Close>
          )}
          {illustration}
          <Primitive.Title className={styles.title}>{title}</Primitive.Title>
          <Primitive.Description className={styles.description}>
            {description}
          </Primitive.Description>
          {children}
          {showCloseAction && (
            <Primitive.Close asChild>
              <Button variant="secondary">关闭</Button>
            </Primitive.Close>
          )}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
