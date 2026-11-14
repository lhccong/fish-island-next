import { useEffect, useRef, useState } from 'react';
import type { LandlordsPort } from '@/domain/landlords';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import styles from './Landlords.module.css';
export function RoomChat({
  port,
  userId,
  roomId,
}: {
  port: LandlordsPort;
  userId: string;
  roomId: string;
}) {
  const [messages, setMessages] = useState<{ key: number; name: string; content: string }[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    let sequence = 0;
    const stop = port.subscribe(
      (e) => {
        if (e.type === 'chat')
          setMessages((old) => [
            ...old.slice(-99),
            { key: ++sequence, name: e.name, content: e.content },
          ]);
        if (!pending.current) return;
        if ((e.type === 'ack' && e.command === 'gameChat') || e.type === 'error') {
          clearTimeout(timer.current);
          pending.current = false;
          setSending(false);
          if (e.type === 'error') setError(e.message);
          else {
            setDraft('');
            setError('');
          }
        }
      },
      () => {},
    );
    return () => {
      stop();
      clearTimeout(timer.current);
    };
  }, [port]);
  return (
    <section className={styles.chat} aria-label="房间聊天">
      <h3>牌桌聊天</h3>
      <ScrollArea label="斗地主聊天记录" gutter="reserved" className={styles.messages ?? ''}>
        {messages.length ? (
          messages.map((m) => (
            <p key={m.key}>
              <strong>{m.name}：</strong>
              {m.content}
            </p>
          ))
        ) : (
          <p className={styles.muted}>还没有发言，和牌友打个招呼吧。</p>
        )}
      </ScrollArea>
      <form
        className={styles.chatForm}
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim() || pending.current) return;
          if (!port.send(userId, 'gameChat', { roomId, content: draft.trim() })) {
            setError('连接未就绪，请重连后重试');
            return;
          }
          pending.current = true;
          setSending(true);
          setError('');
          timer.current = setTimeout(() => {
            pending.current = false;
            setSending(false);
            setError('发送确认超时，请检查记录后重试');
          }, 12000);
        }}
      >
        <input
          aria-label="牌桌发言"
          value={draft}
          readOnly={sending}
          maxLength={200}
          placeholder="和牌友聊两句"
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button type="submit" disabled={sending || !draft.trim()}>
          {sending ? '发送中…' : '发送'}
        </Button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
