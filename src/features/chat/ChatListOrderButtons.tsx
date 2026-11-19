import { useLayoutEffect, useRef } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import styles from './ChatListEditor.module.css';

export function ChatListOrderButtons({
  name,
  index,
  count,
  onMove,
}: {
  name: string;
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
}) {
  const focusAfterMove = useRef<HTMLButtonElement | null>(null);
  useLayoutEffect(() => {
    focusAfterMove.current?.focus();
    focusAfterMove.current = null;
  }, [index]);

  return (
    <div className={styles.orderButtons}>
      {([-1, 1] as const).map((direction) => {
        const disabled = index + direction < 0 || index + direction >= count;
        const label = direction === -1 ? '上移' : '下移';
        const Icon = direction === -1 ? ArrowUp : ArrowDown;
        return (
          <Button
            key={direction}
            variant="secondary"
            className={styles.orderButton}
            aria-label={`${label}${name}`}
            aria-disabled={disabled}
            title={label}
            onClick={(event) => {
              if (disabled) return;
              focusAfterMove.current = event.currentTarget;
              onMove(direction);
            }}
          >
            <Icon size={16} aria-hidden="true" />
          </Button>
        );
      })}
    </div>
  );
}
