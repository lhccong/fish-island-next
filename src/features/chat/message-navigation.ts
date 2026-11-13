import { createStore } from 'zustand/vanilla';
import { parseMessageContent, type ReceivedMessage } from '@/domain/chat';
import type { ChatRealtimeController } from './realtime-controller';

export function mentionsUser(message: ReceivedMessage, userId: string, name: string) {
  if (!name.trim() || message.revoked || message.senderId === userId) return false;
  const token = `@${name.trim().replace(/\s+/g, ' ')}`;
  return parseMessageContent(message.content).some((part) => {
    if (part.kind !== 'text') return false;
    let offset = part.text.indexOf(token);
    while (offset >= 0) {
      const before = part.text.slice(0, offset).at(-1);
      const after = part.text.slice(offset + token.length, offset + token.length + 1);
      if (
        (!before || /[\s，。！？、:：;；(（]/u.test(before)) &&
        (!after || /[\s，。！？、:：;；)）]/u.test(after))
      )
        return true;
      offset = part.text.indexOf(token, offset + token.length);
    }
    return false;
  });
}
export function createMessageNavigation(chat: ChatRealtimeController) {
  const store = createStore<{
    target: string | null;
    revision: number;
    pending: string | null;
    feedback: string;
    mentions: readonly string[];
  }>(() => ({ target: null, revision: 0, pending: null, feedback: '', mentions: [] }));
  let generation = 0;
  let pulsedRevision = 0;
  let release: (() => void) | undefined;
  let feedbackTimer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    generation++;
    clearTimeout(feedbackTimer);
    feedbackTimer = undefined;
    release?.();
    release = undefined;
    store.setState({ pending: null, feedback: '' });
  };
  const locate = async (id: string) => {
    cancel();
    const version = generation;
    store.setState({ pending: id, feedback: '正在定位消息…' });
    let retryError = chat.history.store.getState().status === 'error';
    while (version === generation) {
      const state = chat.store.getState();
      const key = state.ids.find((key) => state.messages[key]?.id === id);
      if (key) {
        const visible = state.visibleIds.includes(key)
          ? key
          : Object.keys(state.repetitions).find((group) => state.repetitions[group]?.includes(key));
        store.setState((current) => ({
          target: visible ?? key,
          revision: current.revision + 1,
          pending: null,
          feedback: '已定位消息',
          mentions: current.mentions.filter((item) => item !== id),
        }));
        feedbackTimer = setTimeout(() => {
          feedbackTimer = undefined;
          if (version === generation) store.setState({ feedback: '' });
        }, 2500);
        return;
      }
      const history = chat.history.store.getState();
      if (history.status === 'loading' || history.status === 'idle') {
        await new Promise<void>((resolve) => {
          const unsubscribe = chat.history.store.subscribe(() => {
            const status = chat.history.store.getState().status;
            if (status !== 'loading' && status !== 'idle') done();
          });
          const done = () => {
            unsubscribe();
            release = undefined;
            resolve();
          };
          release = done;
        });
        continue;
      }
      if (history.status === 'error' && retryError) {
        retryError = false;
        await chat.history.loadMore();
        continue;
      }
      retryError = false;
      if (history.status === 'error' || !history.hasMore) {
        store.setState({
          pending: null,
          feedback:
            history.status === 'error'
              ? '历史消息加载失败，请重试定位'
              : '未找到原文，消息可能已删除或超出当前历史窗口（1000条）',
        });
        return;
      }
      await chat.history.loadMore();
    }
  };
  return {
    store,
    claimPulse(id: string, revision: number) {
      const state = store.getState();
      if (state.target !== id || state.revision !== revision || revision <= pulsedRevision)
        return false;
      pulsedRevision = revision;
      return true;
    },
    locate,
    cancel,
    start(userId: string, name: string) {
      const unsubscribe = chat.subscribeIncoming((message) => {
        if (mentionsUser(message, userId, name))
          store.setState((state) => ({
            mentions: state.mentions.includes(message.id)
              ? state.mentions
              : [...state.mentions, message.id].slice(-1000),
          }));
      });
      const unwatch = chat.store.subscribe((state) => {
        const current = store.getState().mentions;
        if (!current.length) return;
        const valid = new Set(
          Object.values(state.messages)
            .filter((message) => !message.revoked)
            .map((message) => message.id),
        );
        const mentions = current.filter((id) => valid.has(id));
        if (mentions.length !== current.length) store.setState({ mentions });
      });
      return () => {
        unsubscribe();
        unwatch();
        cancel();
      };
    },
  };
}
export type MessageNavigation = ReturnType<typeof createMessageNavigation>;
