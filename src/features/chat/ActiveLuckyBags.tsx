import { useStore } from 'zustand';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import { useChatRealtime } from './realtime-context';
import { LuckyBagMessage } from './LuckyBagMessage';
import styles from './LuckyBag.module.css';

export default function ActiveLuckyBags() {
  const { luckyBags } = useChatRealtime();
  const state = useStore(luckyBags.active.store);
  return (
    <>
      <ScrollArea label="进行中的福袋列表" gutter="reserved" className={styles.scroll ?? ''}>
        <div className={styles.content}>
          {state.loading && <p role="status">福袋列表加载中…</p>}
          {state.error && <p role="alert">{state.error}</p>}
          {!state.loading && !state.error && state.bags.length === 0 && (
            <p>暂无进行中的福袋，可以发送一个邀请岛友参与。</p>
          )}
          {state.bags.map((bag) => (
            <LuckyBagMessage key={bag.id} id={bag.id} initialDetail={bag} />
          ))}
        </div>
      </ScrollArea>
      <div className={styles.actions}>
        <Button
          variant="secondary"
          disabled={state.loading}
          onClick={() => {
            void luckyBags.active.load();
          }}
        >
          {state.error ? '重试列表' : '刷新列表'}
        </Button>
      </div>
    </>
  );
}
