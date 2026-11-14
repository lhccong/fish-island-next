import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { GomokuSocialPort, PublicGameMessage } from '@/domain/gomoku';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import styles from './Gomoku.module.css';

export function PublicGameChat({ port }: { port: GomokuSocialPort }) {
  const [messages, setMessages] = useState<PublicGameMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const retryInput = useRef<{ text: string; id: string } | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const append = (message: PublicGameMessage) =>
    setMessages((items) => [...items.filter((item) => item.id !== message.id), message].slice(-30));
  useEffect(() => port.subscribe(append), [port]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (following.current && viewport.current)
      viewport.current.scrollTop = viewport.current.scrollHeight;
  }, [messages]);
  useEffect(() => {
    const node = viewport.current;
    const scroll = () => {
      if (node) following.current = node.scrollHeight - node.clientHeight - node.scrollTop < 48;
    };
    node?.addEventListener('scroll', scroll, { passive: true });
    return () => node?.removeEventListener('scroll', scroll);
  }, []);
  const send = async () => {
    if (request.current || !draft.trim()) return;
    const text = draft.trim();
    if (retryInput.current?.text !== text) retryInput.current = { text, id: crypto.randomUUID() };
    const abort = new AbortController();
    request.current = abort;
    setPending(true);
    setError('');
    try {
      const message = await port.send(text, abort.signal, retryInput.current.id);
      if (!abort.signal.aborted) {
        append(message);
        setDraft('');
        retryInput.current = null;
        following.current = true;
      }
    } catch (e) {
      if (!abort.signal.aborted) setError(e instanceof Error ? e.message : '发送失败，请重试。');
    } finally {
      if (!abort.signal.aborted) {
        request.current = null;
        setPending(false);
      }
    }
  };
  return (
    <section className={styles.social} aria-label="公共聊天室">
      <h3>公共聊天室</h3>
      <p>所有在线岛友可见，显示进入游戏后最近 30 条消息。</p>
      <div className={styles.chatScroll}>
        <ScrollArea label="游戏中的公共聊天消息" gutter="reserved" viewportRef={viewport}>
          {messages.length ? (
            <ul>
              {messages.map((message) => {
                const invite = /^\[invite\/chess\]([a-z0-9_-]{1,64})\[\/invite\]$/i.exec(
                  message.content,
                );
                return (
                  <li key={message.id}>
                    <strong>{message.sender}</strong>
                    {invite ? (
                      <Link to={`/game/piece?roomId=${encodeURIComponent(invite[1]!)}&mode=online`}>
                        邀请你加入五子棋房间 {invite[1]}
                      </Link>
                    ) : (
                      message.content
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>还没有新消息，和岛友打个招呼吧。</p>
          )}
        </ScrollArea>
      </div>
      <form
        className={styles.chatForm}
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <input
          aria-label="公共聊天消息"
          value={draft}
          maxLength={500}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="发送到公共聊天室"
          disabled={pending}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault();
          }}
        />
        <Button type="submit" disabled={pending || !draft.trim()}>
          {pending ? '发送中…' : '发送'}
        </Button>
      </form>
      {error && (
        <p role="alert" className={styles.error}>
          {error} 可保留原文重试。
        </p>
      )}
    </section>
  );
}
