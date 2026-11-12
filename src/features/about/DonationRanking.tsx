import { Crown } from 'lucide-react';
import type { Donation } from '@/domain/about';
import { DonationAvatar } from './DonationAvatar';
import styles from './Donation.module.css';

export function DonationRanking({ records }: { records: Donation[] }) {
  const leaders = records.slice(0, 3);
  const remaining = records.slice(3);
  const start = leaders.length + 1;
  return (
    <>
      {!!leaders.length && (
        <ol className={styles.podium} aria-label="赞助前三名">
          {leaders.map((donor, index) => (
            <li
              key={donor.id}
              className={styles.leader}
              data-rank={index + 1}
              aria-label={`第${index + 1}名 ${donor.name}`}
            >
              <span className={styles.medal}>
                {index === 0 && <Crown size={23} aria-hidden="true" />}第 {index + 1} 名
              </span>
              <DonationAvatar donor={donor} large />
              <strong className={styles.leaderName}>{donor.name}</strong>
              <strong className={styles.leaderAmount}>￥{donor.amount.toFixed(2)}</strong>
              <p>{donor.remark || '感谢支持'}</p>
            </li>
          ))}
        </ol>
      )}
      {!!remaining.length && (
        <ol className={styles.rows} start={start} aria-label="赞助排名列表">
          {remaining.map((donor, index) => (
            <li key={donor.id}>
              <span className={styles.rowRank}>{start + index}</span>
              <DonationAvatar donor={donor} />
              <div className={styles.rowText}>
                <strong>{donor.name}</strong>
                <p>{donor.remark || '感谢支持'}</p>
              </div>
              <strong className={styles.rowAmount}>￥{donor.amount.toFixed(2)}</strong>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
