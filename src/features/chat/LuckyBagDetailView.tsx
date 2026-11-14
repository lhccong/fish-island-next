import { useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { useChatRealtime } from './realtime-context';
import { LuckyBagRecords } from './LuckyBagRecords';
import { useLuckyBagDue } from './lucky-bag-presentation';
import { LuckyBagArtwork } from './LuckyBagArtwork';
import styles from './LuckyBag.module.css';

export function LuckyBagDetailView({ id }: { id: string }) {
  const { luckyBags } = useChatRealtime();
  const entry = useMemo(() => luckyBags.entry(id), [luckyBags, id]);
  const { detail, loading, error, joining, feedback, joinError } = useStore(entry.store);
  const [records, setRecords] = useState(false);
  const due = useLuckyBagDue(detail);
  const status = !detail
    ? ''
    : detail.status === 1
      ? '已开奖'
      : detail.status === 2
        ? '已过期'
        : due
          ? '等待开奖，请刷新详情'
          : '进行中';
  return (
    <>
      <ScrollArea label="福袋详情内容" gutter="reserved" className={styles.scroll ?? ''}>
        <div className={styles.content}>
          {loading && <p role="status">福袋加载中…</p>}
          {error && <p role="alert">{error}</p>}
          {detail && (
            <>
              <div className={styles.heading}>
                <LuckyBagArtwork size={64} />
                <div>
                  <h3>{detail.name}</h3>
                  <p>{detail.creatorName} 发起</p>
                </div>
              </div>
              <dl className={styles.meta}>
                <div>
                  <dt>总积分</dt>
                  <dd>{detail.totalAmount} 积分</dd>
                </div>
                <div>
                  <dt>中奖人数</dt>
                  <dd>{detail.winnerCount} 人</dd>
                </div>
                <div>
                  <dt>参与人数</dt>
                  <dd>{detail.participantCount} 人</dd>
                </div>
                <div>
                  <dt>分配方式</dt>
                  <dd>{detail.type === 2 ? '平均分配' : '随机分配'}</dd>
                </div>
              </dl>
              <p>
                开奖时间：
                <time dateTime={new Date(detail.drawTime).toISOString()}>
                  {new Date(detail.drawTime).toLocaleString('zh-CN')}
                </time>
              </p>
              <p>
                {status} · {detail.joined ? '已参与' : '未参与'}
              </p>
            </>
          )}
          {records && <LuckyBagRecords id={id} port={luckyBags.port} />}
        </div>
      </ScrollArea>
      <div className={styles.feedback}>
        {feedback && <p role="status">{feedback}</p>}
        {joinError && <p role="alert">{joinError}</p>}
      </div>
      <div className={styles.actions}>
        <Button
          variant="secondary"
          disabled={loading || joining}
          onClick={() => {
            void entry.load();
          }}
        >
          刷新详情
        </Button>
        <Button variant="secondary" disabled={records} onClick={() => setRecords(true)}>
          中奖记录
        </Button>
        <Button
          disabled={!detail || loading || joining || detail.joined || detail.status !== 0 || due}
          onClick={() => {
            void entry.join();
          }}
        >
          {joining ? '参与中…' : detail?.joined ? '已参与' : '参与福袋'}
        </Button>
      </div>
    </>
  );
}
