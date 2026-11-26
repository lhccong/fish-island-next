import { SquareArrowOutUpRight } from 'lucide-react';
import type { MouseEventHandler, Ref } from 'react';
import { Button } from '@/shared/ui/Button';
import styles from './WindowLauncher.module.css';

export function WindowLauncher({
  label,
  onClick,
  className = '',
  ref,
}: {
  label: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <Button
      ref={ref}
      variant="secondary"
      className={`${styles.launcher} ${className}`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <SquareArrowOutUpRight size={18} aria-hidden="true" />
    </Button>
  );
}
