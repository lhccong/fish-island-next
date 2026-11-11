import type { ReactElement, ReactNode } from 'react';
import * as Primitive from '@radix-ui/react-dialog';
import { Button } from '@/shared/ui/Button';
import styles from './Dialog.module.css';

interface DialogProps {
  trigger: ReactElement;
  title: string;
  description: string;
  children: ReactNode;
}

export function Dialog({ trigger, title, description, children }: DialogProps) {
  return (
    <Primitive.Root>
      <Primitive.Trigger asChild>{trigger}</Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Overlay className={styles.overlay} />
        <Primitive.Content className={styles.content}>
          <Primitive.Title className={styles.title}>{title}</Primitive.Title>
          <Primitive.Description className={styles.description}>
            {description}
          </Primitive.Description>
          {children}
          <Primitive.Close asChild>
            <Button variant="secondary">关闭</Button>
          </Primitive.Close>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
