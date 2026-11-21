import { lazy, Suspense, useRef, useState } from 'react';
import { Gift } from 'lucide-react';
import { useStore } from 'zustand';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useChatRealtime } from './realtime-context';
import styles from './ActiveLuckyBagsLauncher.module.css';
import panelStyles from './SendRedPacket.module.css';

const ActiveLuckyBags = lazy(() => import('./ActiveLuckyBags'));

export function ActiveLuckyBagsLauncher() {
  const { luckyBags } = useChatRealtime();
  const count = useStore(luckyBags.active.store, (state) => state.count);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <Dialog
      title="进行中的福袋"
      description="查看或参与当前群聊的福袋"
      hideDescription
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void luckyBags.active.load();
      }}
      returnFocusRef={trigger}
      className={panelStyles.dialog ?? ''}
      dismissLabel="关闭福袋面板"
      showCloseAction={false}
      trigger={
        <Button
          ref={trigger}
          className={styles.trigger}
          variant="secondary"
          aria-label="进行中的福袋"
          title={count > 0 ? `${count} 个福袋可参与` : '进行中的福袋'}
        >
          <Gift size={20} aria-hidden="true" />
          {count > 0 && (
            <span
              className={styles.badge}
              aria-label={`${count} 个福袋可参与`}
              data-lucky-bag-count={count}
            >
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Button>
      }
    >
      {open && (
        <Suspense fallback={<LoadingIndicator>福袋加载中…</LoadingIndicator>}>
          <ActiveLuckyBags />
        </Suspense>
      )}
    </Dialog>
  );
}
