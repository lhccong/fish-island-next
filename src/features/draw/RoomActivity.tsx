import { useEffect, useRef, useState } from 'react';
import type { DrawMessage, DrawRealtimePort } from '@/domain/draw';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import styles from './Draw.module.css';
export function RoomActivity({ realtime, roomId }: { realtime: DrawRealtimePort; roomId: string }) {
  const [messages, setMessages] = useState<DrawMessage[]>([]);
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      realtime.messages((message) => {
        if (message.roomId !== roomId) return;
        const view = viewport.current;
        const follow = view && view.scrollHeight - view.scrollTop - view.clientHeight < 48;
        setMessages((items) =>
          items.some((item) => item.id === message.id) ? items : [...items.slice(-99), message],
        );
        if (follow)
          requestAnimationFrame(() => {
            if (viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight;
          });
      }),
    [realtime, roomId],
  );
  return (
    <section className={styles.panel}>
      <h3>房间动态</h3>
      <div className={styles.records}>
        <ScrollArea label="房间动态" gutter="reserved" viewportRef={viewport}>
          <div className={styles.recordContent}>
            {messages.length ? (
              messages.map((message) => (
                <p key={message.id}>
                  <span>{message.name}</span> {message.content}
                </p>
              ))
            ) : (
              <p>新的房间发言和游戏提示会显示在这里。</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </section>
  );
}
