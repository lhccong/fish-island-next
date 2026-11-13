import { MapPin } from 'lucide-react';
import { useRef } from 'react';
import { messagePreview, type ReceivedMessage } from '@/domain/chat';
import { ContextMenu } from '@/shared/ui/ContextMenu';
import { useChatRealtime } from './realtime-context';
import styles from './MessageStream.module.css';

export function MessageQuote({ quote }: { quote: NonNullable<ReceivedMessage['quote']> }) {
  const { navigation } = useChatRealtime();
  const ref = useRef<HTMLButtonElement>(null);
  const locate = () => {
    void navigation.locate(quote.id);
  };
  return (
    <ContextMenu
      label="引用消息操作"
      items={[
        { label: '定位原文', icon: <MapPin size={16} aria-hidden="true" />, onSelect: locate },
      ]}
      returnFocusRef={ref}
    >
      <button
        type="button"
        ref={ref}
        className={styles.quote}
        onClick={locate}
        onContextMenu={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))
            event.stopPropagation();
        }}
        aria-label={`定位原文：${quote.senderName}`}
      >
        引用 {quote.senderName}：{messagePreview(quote.content)}
      </button>
    </ContextMenu>
  );
}
