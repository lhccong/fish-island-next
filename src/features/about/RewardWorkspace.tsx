import { useCallback, useState } from 'react';
import { Heart, ArrowUpRight } from 'lucide-react';
import type { AboutPort } from '@/domain/about';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { DonationList } from './DonationList';
import { PaymentDialog } from './PaymentDialog';
import styles from './Donation.module.css';
import paymentStyles from './Payment.module.css';

export function RewardWorkspace({ service }: { service: AboutPort }) {
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const onPaid = useCallback(() => setRevision((value) => value + 1), []);
  return (
    <>
      <ScrollArea label="赞助榜" gutter="reserved">
        <div className={styles.workspace}>
          <div className={styles.heading}>
            <div>
              <h2>
                <Heart size={22} aria-hidden="true" /> 每一份支持，都让鱼岛更好
              </h2>
              <p>感谢每一位同行的朋友，一起共建摸鱼岛。</p>
            </div>
            <Button className={paymentStyles.supportButton} onClick={() => setOpen(true)}>
              <Heart size={17} className={paymentStyles.supportHeart} aria-hidden="true" />
              打赏支持
              <ArrowUpRight size={15} aria-hidden="true" />
            </Button>
          </div>
          <div className={styles.rewardGrid}>
            <DonationList service={service} revision={revision} />
            <DonationList service={service} details revision={revision} />
          </div>
        </div>
      </ScrollArea>
      {open && <PaymentDialog service={service} onClose={() => setOpen(false)} onPaid={onPaid} />}
    </>
  );
}
