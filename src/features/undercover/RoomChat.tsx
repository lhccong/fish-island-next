import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AuthUser } from '@/domain/auth';
import type { RoomMessage, UndercoverRoom, UndercoverRealtimePort } from '@/domain/undercover';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import { RoomComposer } from './RoomComposer';
import { SpeakingCountdown } from './SpeakingCountdown';
import { appendRoomMessage } from './messages';
import styles from './Undercover.module.css';
import roomStyles from './Room.module.css';
export function RoomChat({
  room,
  realtime,
  user,
}: {
  room: UndercoverRoom;
  realtime: UndercoverRealtimePort;
  user: AuthUser;
}) {
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [connected, setConnected] = useState(realtime.connected);
  const [error, setError] = useState('');
  const [newMessages, setNewMessages] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const nearBottom = () => {
    const e = viewport.current;
    return !e || e.scrollHeight - e.scrollTop - e.clientHeight < 64;
  };
  const add = (message: RoomMessage) => {
    follow.current = nearBottom();
    if (!follow.current) setNewMessages(true);
    setMessages((old) => appendRoomMessage(old, message, room.id));
  };
  useEffect(
    () =>
      realtime.subscribe((event) => {
        if (event.type === 'message' && event.message.roomId === room.id) {
          const e = viewport.current;
          follow.current = !e || e.scrollHeight - e.scrollTop - e.clientHeight < 64;
          if (!follow.current) setNewMessages(true);
          setMessages((old) => appendRoomMessage(old, event.message, room.id));
        }
        if (event.type === 'connection') setConnected(event.connected);
        if (event.type === 'error') setError(event.message);
      }),
    [realtime, room.id],
  );
  useLayoutEffect(() => {
    if (follow.current && viewport.current)
      viewport.current.scrollTop = viewport.current.scrollHeight;
  }, [messages]);
  const me = room.players.find((p) => p.id === user.id);
  return (
    <section className={`${styles.panel} ${roomStyles.chat}`} aria-label="房间发言">
      <div className={styles.heading}>
        <h3>房间发言</h3>
        <span>{connected ? '已连接' : '连接中断，等待重连'}</span>
      </div>
      <p className={roomStyles.hint}>
        仅显示本次打开后收到的发言，最多保留 300 条。旧服务不提供历史及送达回执。
      </p>
      <SpeakingCountdown realtime={realtime} roomId={room.id} />
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={roomStyles.messages}>
        <ScrollArea label="房间发言记录" gutter="reserved" viewportRef={viewport}>
          <ol className={roomStyles.messageList}>
            {!messages.length && (
              <li className={roomStyles.empty}>还没有发言，加入房间后开始交流。</li>
            )}
            {messages.map((m) => (
              <li key={`${m.senderId}:${m.id}`} data-own={m.senderId === user.id}>
                <small>
                  {m.name} · {new Date(m.time).toLocaleTimeString('zh-CN', { hour12: false })}
                  {m.submitted && ' · 已提交'}
                </small>
                <p>{m.content}</p>
              </li>
            ))}
          </ol>
        </ScrollArea>
      </div>
      {newMessages && (
        <Button
          variant="secondary"
          onClick={() => {
            if (viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight;
            follow.current = true;
            setNewMessages(false);
          }}
        >
          查看新发言
        </Button>
      )}
      <RoomComposer
        roomId={room.id}
        realtime={realtime}
        user={user}
        enabled={!!me && !me.eliminated && room.status !== 'ENDED'}
        connected={connected}
        onSubmitted={add}
      />
    </section>
  );
}
