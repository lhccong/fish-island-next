import { Clock3, History } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Donation } from '@/domain/about';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { DonationAvatar } from './DonationAvatar';
import styles from './Donation.module.css';

export function DonationActivity({
  records,
  total,
  feedback,
  end,
}: {
  records: Donation[];
  total: number;
  feedback: ReactNode;
  end: ReactNode;
}) {
  return (
    <section className={styles.activity} aria-label="打赏动态">
      <h2 className={styles.activityHeading}>
        <History size={17} aria-hidden="true" />
        打赏动态
        <span className={styles.count} aria-label={`共 ${total} 条打赏动态`}>
          {total}
        </span>
      </h2>
      <div className={styles.activityScroll}>
        <ScrollArea label="打赏动态记录" gutter="reserved">
          <div className={styles.activityBody}>
            <ol className={styles.activityRows}>
              {records.map((donor) => (
                <li key={donor.id}>
                  <DonationAvatar donor={donor} />
                  <div className={styles.activityText}>
                    <div className={styles.activityTop}>
                      <strong title={donor.name}>{donor.name}</strong>
                      <span>+￥{donor.amount.toFixed(2)}</span>
                    </div>
                    <p title={donor.remark}>{donor.remark || '感谢支持'}</p>
                    <time dateTime={donor.createdAt}>
                      <Clock3 size={12} aria-hidden="true" />
                      {donor.createdAt
                        ? donor.createdAt.replace('T', ' ').slice(0, 10)
                        : '日期未提供'}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
            {feedback}
            {end}
          </div>
        </ScrollArea>
      </div>
    </section>
  );
}
