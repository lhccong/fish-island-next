import type { ReactNode } from 'react';
import * as Primitive from '@radix-ui/react-scroll-area';
import styles from './ScrollArea.module.css';

interface ScrollAreaProps {
  children: ReactNode;
  label: string;
  className?: string;
  gutter?: 'overlay' | 'reserved';
}

export function ScrollArea({
  children,
  label,
  className = '',
  gutter = 'overlay',
}: ScrollAreaProps) {
  return (
    <Primitive.Root
      type="auto"
      scrollHideDelay={650}
      data-gutter={gutter}
      className={`${styles.root} ${className}`}
    >
      <Primitive.Viewport className={styles.viewport} tabIndex={0} role="region" aria-label={label}>
        {children}
      </Primitive.Viewport>
      <Primitive.Scrollbar orientation="vertical" className={styles.scrollbar}>
        <Primitive.Thumb className={styles.thumb} />
      </Primitive.Scrollbar>
      <Primitive.Corner />
    </Primitive.Root>
  );
}
