import type { ReactNode } from 'react';
import { Button } from '@/shared/ui/Button';
import { SourceAvatar } from '@/shared/ui/SourceAvatar';
import { ProfileCardMedia } from './ProfileCardMedia';
import styles from './ProfileCard.module.css';

interface CardCount {
  label: string;
  value: number | undefined;
  onSelect: (trigger: HTMLButtonElement) => void;
}

interface ProfileCardProps {
  name: string;
  displayName?: string | undefined;
  avatar: string | null;
  frame?: string | null | undefined;
  profile?: string | undefined;
  subtitle?: string;
  nameBadge?: ReactNode;
  badges?: ReactNode;
  counts: readonly CardCount[];
  actions?: ReactNode;
  children?: ReactNode;
}

export function ProfileCard({
  name,
  displayName = name,
  avatar,
  frame,
  profile,
  subtitle,
  nameBadge,
  badges,
  counts,
  actions,
  children,
}: ProfileCardProps) {
  return (
    <article className={styles.info}>
      <div className={styles.identity}>
        <div className={styles.avatar}>
          <SourceAvatar name={name} src={avatar} size="profile" />
          {frame && <ProfileCardMedia key={frame} src={frame} name={name} frame />}
        </div>
        <div className={styles.name}>
          <h3>
            {displayName}
            {nameBadge && <span className={styles.nameBadge}>{nameBadge}</span>}
          </h3>
          {subtitle && <p>{subtitle}</p>}
          {badges}
        </div>
        {profile && <p className={styles.profile}>{profile}</p>}
      </div>
      <div className={styles.commands}>
        <div className={styles.counts}>
          {counts.map(({ label, value, onSelect }) => (
            <Button
              key={label}
              variant="secondary"
              className={styles.countOption}
              aria-label={value === undefined ? `${label}人数未知` : `${label} ${value}`}
              onClick={(event) => onSelect(event.currentTarget)}
            >
              <strong>{value ?? '—'}</strong>
              <span>{label}</span>
            </Button>
          ))}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {children}
    </article>
  );
}

export function ProfileCardDetails({ children }: { children: ReactNode }) {
  return <dl className={styles.details}>{children}</dl>;
}

export function ProfileCardStatus({
  message,
  error,
  retryLabel,
  onRetry,
}: {
  message: string;
  error?: boolean;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className={styles.state}>
      <p role={error ? 'alert' : 'status'}>{message}</p>
      <Button variant="secondary" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}
