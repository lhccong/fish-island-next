import { SquareArrowOutUpRight } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import styles from './WindowLauncher.module.css';

export function WindowLauncher({
  label,
  onClick,
  className = '',
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
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
