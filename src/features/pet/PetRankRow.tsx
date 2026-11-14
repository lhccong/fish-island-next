import type { ReactNode } from 'react';
import { RankAvatar } from './RankAvatar';
import styles from './Rankings.module.css';

export function PetRankRow({
  rank,
  name,
  owner,
  avatar,
  petUrl,
  metric,
  mine = false,
  children,
}: {
  rank: number;
  name: string;
  owner?: string;
  avatar: string;
  petUrl?: string;
  metric: string;
  mine?: boolean;
  children?: ReactNode;
}) {
  const title = name.trim() || owner?.trim() || '未命名伙伴';
  return (
    <li
      className={styles.row}
      data-podium={rank >= 1 && rank <= 3 ? rank : undefined}
      data-mine={mine}
    >
      <span className={styles.rank} aria-label={`第 ${rank} 名`}>
        {rank}
      </span>
      <RankAvatar
        name={owner?.trim() || title}
        avatar={avatar}
        petName={title}
        {...(petUrl ? { petUrl } : {})}
      />
      <div className={styles.identity}>
        <strong>
          {title}
          {mine ? '（我）' : ''}
        </strong>
        {owner && <small>{owner}</small>}
      </div>
      <span className={styles.metric}>{metric}</span>
      {children && <div className={styles.actions}>{children}</div>}
    </li>
  );
}
