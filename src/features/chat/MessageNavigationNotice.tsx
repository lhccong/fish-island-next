import { AtSign, MapPin, LoaderCircle, X } from 'lucide-react';
import { useStore } from 'zustand';
import { Button } from '@/shared/ui/Button';
import { useChatRealtime } from './realtime-context';
import styles from './MessageStream.module.css';

export function MessageNavigationNotice() {
  const { navigation } = useChatRealtime();
  const state = useStore(navigation.store, (state) => state);
  if (!state.mentions.length && !state.feedback) return null;
  return (
    <div className={styles.navigationNotice}>
      {state.mentions.length > 0 && (
        <Button
          variant="secondary"
          className={styles.noticeAction}
          aria-label={`有 ${state.mentions.length} 条消息 @我，点击查看`}
          onClick={() => {
            void navigation.locate(state.mentions[0]!);
          }}
        >
          <AtSign size={16} aria-hidden="true" />
          <span>{state.mentions.length} 条消息提到我</span>
        </Button>
      )}
      {state.feedback && (
        <span role="status" className={styles.navigationFeedback}>
          {state.pending ? (
            <LoaderCircle size={15} aria-hidden="true" />
          ) : (
            <MapPin size={15} aria-hidden="true" />
          )}
          <span>{state.feedback}</span>
        </span>
      )}
      {state.pending && (
        <Button
          variant="secondary"
          className={styles.noticeAction}
          onClick={() => {
            navigation.cancel();
            navigation.store.setState({ pending: null, feedback: '已取消定位' });
          }}
        >
          <X size={15} aria-hidden="true" />
          取消定位
        </Button>
      )}
    </div>
  );
}
