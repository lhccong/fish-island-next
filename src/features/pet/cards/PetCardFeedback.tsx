import { dailyPetPackLimit, type PetCardBatchResult } from '@/domain/pet';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import styles from './PetCards.module.css';

export function PetCardFeedback({
  notice,
  pending,
  daily,
  batch,
  onHistory,
}: {
  notice: { error: boolean; message: string } | null;
  pending: boolean;
  daily: boolean;
  batch: PetCardBatchResult | null;
  onHistory: () => void;
}) {
  return (
    <div className={styles.feedback}>
      {notice?.message && <p role={notice.error ? 'alert' : 'status'}>{notice.message}</p>}
      {pending && <LoadingIndicator compact>正在保存…</LoadingIndicator>}
      {batch?.type === 'open' && (
        <div className={styles.batchFeedback}>
          <p role="status">
            已拆开 {batch.openedPacks} 包，获得 {batch.newCards} 张新卡、{batch.duplicateCards}{' '}
            张重复卡。
          </p>
          <Button variant="secondary" onClick={onHistory}>
            查看开包记录
          </Button>
        </div>
      )}
      {batch?.type === 'upgrade' && (
        <p role="status">
          已为 {batch.upgradedCards} 张卡片合计提升 {batch.addedStars} 星，消耗{' '}
          {batch.spentDuplicates} 张重复卡。
        </p>
      )}
      {daily && !batch && <p>海岛每日免费 {dailyPetPackLimit} 包，北京时间 00:00 重置。</p>}
    </div>
  );
}
