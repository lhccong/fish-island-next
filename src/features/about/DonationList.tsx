import type { AboutPort } from '@/domain/about';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { useDonations } from './use-donations';
import { DonationRanking } from './DonationRanking';
import { DonationActivity } from './DonationActivity';
import { DonationEnd } from './DonationEnd';
import styles from './Donation.module.css';

export function DonationList({
  service,
  details = false,
  revision,
}: {
  service: AboutPort;
  details?: boolean;
  revision: number;
}) {
  const state = useDonations(service, details, revision);
  const { records, total } = state.data;
  const feedback =
    state.status === 'loading' ? (
      <p className={styles.feedback} role="status">
        正在加载{details ? '打赏动态' : '排行榜'}…
      </p>
    ) : state.status === 'error' ? (
      <div className={styles.feedback}>
        <p role="alert">{state.error}</p>
        <Button variant="secondary" onClick={state.reload}>
          重试{details ? '动态' : '榜单'}
        </Button>
      </div>
    ) : !records.length ? (
      <p className={styles.feedback}>暂无打赏记录</p>
    ) : null;
  const end = (
    <DonationEnd
      enabled={state.status === 'ready' && state.hasMore}
      onLoadMore={state.loadMore}
      loaded={records.length}
      total={total}
      hasMore={state.hasMore}
    />
  );
  if (details)
    return <DonationActivity records={records} total={total} feedback={feedback} end={end} />;
  return (
    <section className={styles.ranking} aria-label="排行榜">
      <h2 className={styles.rankTitle}>排行榜</h2>
      <div className={styles.rankScroll}>
        <ScrollArea label="赞助排名滚动区" gutter="reserved">
          <div className={styles.rankBody}>
            <DonationRanking records={records} />
            {feedback}
            {end}
          </div>
        </ScrollArea>
      </div>
    </section>
  );
}
