import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  DrawGuess,
  DrawIdentity,
  DrawMessage,
  DrawPort,
  DrawRealtimePort,
} from '@/domain/draw';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { RoomComposer } from './RoomComposer';
import styles from './Draw.module.css';
export function RoomActivity({
  service,
  realtime,
  roomId,
  user,
  guesses,
  getSignal,
  canGuess,
  unavailable,
  onGuess,
}: {
  service: DrawPort;
  realtime: DrawRealtimePort;
  roomId: string;
  user: DrawIdentity;
  guesses: readonly DrawGuess[];
  getSignal: () => AbortSignal;
  canGuess: boolean;
  unavailable: string;
  onGuess: () => void;
}) {
  const [messages, setMessages] = useState<DrawMessage[]>([]);
  const viewport = useRef<HTMLDivElement>(null);
  const follow = useRef(false);
  const localSequence = useRef(0);
  const append = useCallback((message: DrawMessage, own = false) => {
    const view = viewport.current;
    follow.current =
      own || Boolean(view && view.scrollHeight - view.scrollTop - view.clientHeight < 48);
    setMessages((items) =>
      items.some((item) => item.id === message.id) ? items : [...items.slice(-99), message],
    );
  }, []);
  useEffect(
    () =>
      realtime.messages((message) => {
        if (message.roomId === roomId) append(message);
      }),
    [realtime, roomId, append],
  );
  useLayoutEffect(() => {
    const view = viewport.current;
    if (view && follow.current) view.scrollTop = view.scrollHeight;
    follow.current = false;
  }, [messages]);
  return (
    <section className={styles.panel} aria-label="聊天与猜词记录">
      <h3>聊天室</h3>
      <div className={`${styles.records} ${styles.chatRecords}`}>
        <ScrollArea label="聊天室消息" gutter="reserved" viewportRef={viewport}>
          <div className={styles.recordContent}>
            {messages.length ? (
              messages.map((message) => (
                <p key={message.id}>
                  <span>{message.name}</span> {message.content}
                </p>
              ))
            ) : (
              <p>还没有房间消息。</p>
            )}
          </div>
        </ScrollArea>
      </div>
      <RoomComposer
        service={service}
        roomId={roomId}
        user={user}
        getSignal={getSignal}
        canGuess={canGuess}
        unavailable={unavailable}
        onSent={(content, guessed) => {
          append(
            { id: `local:${++localSequence.current}`, roomId, name: user.name, content },
            true,
          );
          if (guessed) onGuess();
        }}
      />
      <div className={styles.guessRecords}>
        <h3>猜词记录</h3>
        <div className={styles.records}>
          <ScrollArea label="猜词记录" gutter="reserved">
            <div className={styles.recordContent}>
              {guesses.length ? (
                guesses.map((guess) => (
                  <p key={guess.id}>
                    <span>{guess.name}</span> {guess.correct ? '猜对了！' : guess.word}
                  </p>
                ))
              ) : (
                <p>还没有人猜词，看看画布上的线索。</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </section>
  );
}
