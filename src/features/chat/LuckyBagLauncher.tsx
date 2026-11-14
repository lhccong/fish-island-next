import { lazy, Suspense, useRef, useState } from 'react';
import { Gift, List } from 'lucide-react';
import { useStore } from 'zustand';
import { useChatRealtime } from './realtime-context';
import badgeStyles from './LuckyBagLauncher.module.css';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import styles from './SendRedPacket.module.css';

const Form = lazy(() => import('./SendLuckyBagForm'));
const Active = lazy(() => import('./ActiveLuckyBags'));
export function LuckyBagLauncher() {
  const { luckyBags } = useChatRealtime();
  const count = useStore(luckyBags.active.store, (state) => state.count);
  const [panel, setPanel] = useState<'send' | 'active'>('send');
  const [open, setOpen] = useState(false);
  const send = useRef<HTMLButtonElement>(null);
  const active = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button
        ref={send}
        variant="secondary"
        aria-label="发福袋"
        title="发福袋"
        onClick={() => {
          setPanel('send');
          setOpen(true);
        }}
      >
        <Gift size={20} aria-hidden="true" />
      </Button>
      <Button
        ref={active}
        className={badgeStyles.active ?? ''}
        variant="secondary"
        aria-label="进行中的福袋"
        title={count > 0 ? `${count} 个福袋可参与` : '进行中的福袋'}
        onClick={() => {
          setPanel('active');
          setOpen(true);
          void luckyBags.active.load();
        }}
      >
        <List size={20} aria-hidden="true" />
        {count > 0 && (
          <span
            className={badgeStyles.badge}
            aria-label={`${count} 个福袋可参与`}
            data-lucky-bag-count={count}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Button>
      <Dialog
        title={panel === 'active' ? '进行中的福袋' : '发送福袋'}
        description="到期由系统随机开奖"
        hideDescription
        open={open}
        onOpenChange={setOpen}
        returnFocusRef={panel === 'active' ? active : send}
        className={styles.dialog ?? ''}
        dismissLabel="关闭福袋面板"
        showCloseAction={false}
      >
        <Suspense fallback={<p role="status">福袋加载中…</p>}>
          {open && panel === 'send' && <Form onClose={() => setOpen(false)} />}
          {open && panel === 'active' && <Active />}
        </Suspense>
      </Dialog>
    </>
  );
}
