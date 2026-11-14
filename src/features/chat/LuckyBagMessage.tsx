import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import type { LuckyBagDetail } from '@/domain/chat';
import { useLuckyBagDue } from './lucky-bag-presentation';
import { LuckyBagArtwork } from './LuckyBagArtwork';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { useChatRealtime } from './realtime-context';
import { LuckyBagDetailView } from './LuckyBagDetailView';
import styles from './LuckyBag.module.css';

export function LuckyBagMessage({
  id,
  initialDetail,
}: {
  id: string;
  initialDetail?: LuckyBagDetail;
}) {
  const { luckyBags } = useChatRealtime();
  const entry = useMemo(() => luckyBags.entry(id, initialDetail), [luckyBags, id, initialDetail]);
  useEffect(() => entry.retain(), [entry]);
  useEffect(() => {
    if (initialDetail) entry.acceptSnapshot(initialDetail);
  }, [entry, initialDetail]);
  const { detail, loading, error } = useStore(entry.store);
  const due = useLuckyBagDue(detail);
  const status =
    detail?.status === 1
      ? '已开奖'
      : detail?.status === 2
        ? '已过期'
        : due
          ? '等待开奖'
          : detail?.joined
            ? '已参与'
            : '查看并参与';
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <span className={styles.message} data-lucky-bag="true">
      <Button
        ref={trigger}
        variant="secondary"
        className={styles.card}
        aria-label={`查看福袋：${detail?.name || '福袋'}`}
        onClick={() => {
          setOpen(true);
          void entry.load();
        }}
      >
        <LuckyBagArtwork size={64} decorative />
        <span className={styles.cardText}>
          <strong>{detail?.name || '福袋'}</strong>
          <span>
            {detail
              ? `${detail.totalAmount} 积分 · ${status}`
              : error
                ? '加载失败，点击重试'
                : loading
                  ? '福袋加载中…'
                  : '查看福袋'}
          </span>
        </span>
      </Button>
      <Dialog
        title="福袋详情"
        description="参与后等待系统开奖"
        hideDescription
        open={open}
        onOpenChange={setOpen}
        returnFocusRef={trigger}
        className={styles.dialog ?? ''}
        dismissLabel="关闭福袋详情"
        showCloseAction={false}
      >
        {open && <LuckyBagDetailView id={id} />}
      </Dialog>
    </span>
  );
}
