import { Apple, Heart, Settings2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import styles from './PetWorkspace.module.css';

export function CareActions({
  disabled,
  pending,
  onCare,
  onAuto,
}: {
  disabled: boolean;
  pending: boolean;
  onCare: (action: 'feed' | 'pat') => void;
  onAuto: () => void;
}) {
  return (
    <div className={styles.careBar}>
      <span className={styles.careStatus}>
        {pending && <LoadingIndicator compact>正在照料…</LoadingIndicator>}
      </span>
      <Button
        disabled={disabled}
        aria-label="喂食 · 5 积分"
        title="喂食 · 5 积分"
        onClick={() => onCare('feed')}
      >
        <Apple size={16} aria-hidden="true" />
        <span>5</span>
      </Button>
      <Button
        variant="secondary"
        disabled={disabled}
        aria-label="抚摸 · 3 积分"
        title="抚摸 · 3 积分"
        onClick={() => onCare('pat')}
      >
        <Heart size={16} aria-hidden="true" />
        <span>3</span>
      </Button>
      <Button
        variant="secondary"
        className={styles.iconAction}
        disabled={disabled}
        aria-label="设置自动喂食"
        title="自动喂食"
        onClick={onAuto}
      >
        <Settings2 size={16} aria-hidden="true" />
      </Button>
    </div>
  );
}
