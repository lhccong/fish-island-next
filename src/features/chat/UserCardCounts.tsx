import type { RefObject } from 'react';
import type { FollowKind, UserCard } from '@/domain/account-tools';
import { Button } from '@/shared/ui/Button';
import styles from './UserCard.module.css';

export function UserCardCounts({
  card,
  triggerRef,
  onSelect,
}: {
  card: Pick<UserCard, FollowKind>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onSelect: (kind: FollowKind) => void;
}) {
  return (
    <div className={styles.counts}>
      {(['following', 'followers'] as const).map((kind) => (
        <Button
          key={kind}
          variant="secondary"
          className={styles.countOption}
          onClick={(event) => {
            triggerRef.current = event.currentTarget;
            onSelect(kind);
          }}
        >
          <strong>{card[kind] ?? '—'}</strong>
          <span>{kind === 'following' ? '关注' : '粉丝'}</span>
        </Button>
      ))}
    </div>
  );
}
