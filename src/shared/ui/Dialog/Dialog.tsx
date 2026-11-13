import {
  useRef,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { X } from 'lucide-react';
import * as Primitive from '@radix-ui/react-dialog';
import { Button } from '@/shared/ui/Button';
import styles from './Dialog.module.css';

interface DialogProps {
  modal?: boolean;
  hideDescription?: boolean;
  hideTitle?: boolean;
  style?: CSSProperties;
  trigger?: ReactElement;
  returnFocusRef?: RefObject<HTMLElement | null>;
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
  modal = true,
  hideDescription = false,
  hideTitle = false,
  style,
  trigger,
  returnFocusRef,
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
      modal={modal}
      {...(open !== undefined ? { open } : {})}
      {...(onOpenChange ? { onOpenChange } : {})}
    >
      {trigger && <Primitive.Trigger asChild>{trigger}</Primitive.Trigger>}
      <Primitive.Portal>
        {modal && <Primitive.Overlay className={styles.overlay} />}
        <Primitive.Content
          className={`${styles.content} ${className}`}
          style={style}
          onOpenAutoFocus={() => {
            returnFocus.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(event) => {
            const target = returnFocusRef?.current ?? (!trigger ? returnFocus.current : null);
            if (target?.isConnected) {
              event.preventDefault();
              target.focus();
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
          <Primitive.Title className={hideTitle ? styles.hiddenDescription : styles.title}>
            {title}
          </Primitive.Title>
          <Primitive.Description
            className={hideDescription ? styles.hiddenDescription : styles.description}
          >
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
