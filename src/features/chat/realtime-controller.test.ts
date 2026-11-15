import { afterEach, expect, it, vi } from 'vitest';
import type { ChatEvent, ChatRealtimePort } from '@/domain/chat';
import { createChatRealtimeController } from './realtime-controller';

afterEach(() => vi.useRealTimers());
it.each(['redpacket', 'luckybag'])(
  'only admins can revoke %s messages, including their own',
  (tag) => {
    vi.useFakeTimers();
    let receive!: (event: ChatEvent) => void;
    const revoke = vi.fn(() => true);
    const controller = createChatRealtimeController({
      connect(onEvent) {
        receive = onEvent;
        return { close() {}, retry() {}, revoke };
      },
    });
    const stop = controller.start();
    receive({
      type: 'message',
      message: {
        id: 'reward',
        senderId: 'self',
        senderName: '合成',
        content: `前文[${tag}]synthetic[/${tag}]后文`,
        createdAt: 1,
        revoked: false,
      },
    });
    vi.advanceTimersByTime(16);
    controller.revoke('reward', 'self');
    controller.revoke('reward', 'self', 'user');
    controller.revoke('reward', 'other', 'user');
    expect(revoke).not.toHaveBeenCalled();
    controller.revoke('reward', 'other', 'admin');
    expect(revoke).toHaveBeenCalledExactlyOnceWith('reward');
    stop();
  },
);

it('allows only admins to revoke another sender, with timeout retry and server confirmation', () => {
  vi.useFakeTimers();
  let receive!: (event: ChatEvent) => void;
  const revoke = vi.fn(() => true);
  const controller = createChatRealtimeController({
    connect(onEvent, onState) {
      receive = onEvent;
      onState('connected');
      return { close() {}, retry() {}, revoke };
    },
  });
  const stop = controller.start();
  receive({
    type: 'message',
    message: {
      id: 'other-message',
      senderId: 'other',
      senderName: '合成岛友',
      content: '原文',
      createdAt: 1,
      revoked: false,
    },
  });
  vi.advanceTimersByTime(16);
  controller.revoke('other-message', 'self');
  controller.revoke('other-message', 'self', 'user');
  expect(revoke).not.toHaveBeenCalled();
  controller.revoke('other-message', 'self', 'admin');
  controller.revoke('other-message', 'self', 'admin');
  expect(revoke).toHaveBeenCalledExactlyOnceWith('other-message');
  expect(controller.store.getState().revokeState['other-message']).toBe('pending');
  expect(controller.store.getState().messages['other-message']?.content).toBe('原文');
  vi.advanceTimersByTime(10000);
  expect(controller.store.getState().revokeState['other-message']).toBe('error');
  controller.revoke('other-message', 'self', 'user');
  expect(revoke).toHaveBeenCalledTimes(1);
  controller.revoke('other-message', 'self', 'admin');
  expect(revoke).toHaveBeenCalledTimes(2);
  receive({ type: 'revoke', id: 'other-message' });
  vi.advanceTimersByTime(16);
  expect(controller.store.getState().messages['other-message']).toMatchObject({
    content: '',
    revoked: true,
  });
  expect(controller.store.getState().revokeState['other-message']).toBeUndefined();
  controller.revoke('other-message', 'self', 'admin');
  expect(revoke).toHaveBeenCalledTimes(2);
  stop();
  expect(vi.getTimerCount()).toBe(0);
});

it('batches a burst, confirms revoke only on push, and clears all work at logout', () => {
  vi.useFakeTimers();
  let receive!: (event: ChatEvent) => void;
  const close = vi.fn();
  const revoke = vi.fn(() => true);
  const port: ChatRealtimePort = {
    connect(onEvent, onState) {
      receive = onEvent;
      onState('connected');
      return { close, revoke, retry: vi.fn() };
    },
  };
  const controller = createChatRealtimeController(port);
  const stop = controller.start();
  const subscriber = vi.fn();
  controller.store.subscribe(subscriber);
  for (let i = 0; i < 200; i++)
    receive({
      type: 'message',
      message: {
        id: String(i),
        senderId: 'self',
        senderName: '合成',
        content: '合成',
        createdAt: i,
        revoked: false,
      },
    });
  expect(subscriber).toHaveBeenCalledOnce();
  expect(controller.store.getState().ids).toHaveLength(200);
  controller.revoke('1', 'other');
  expect(revoke).not.toHaveBeenCalled();
  controller.revoke('1', 'self');
  controller.revoke('1', 'self');
  expect(revoke).toHaveBeenCalledOnce();
  expect(controller.store.getState().messages['1']?.revoked).toBe(false);
  vi.advanceTimersByTime(10000);
  expect(controller.store.getState().revokeState['1']).toBe('error');
  controller.revoke('1', 'self');
  receive({ type: 'revoke', id: '1' });
  vi.advanceTimersByTime(16);
  expect(controller.store.getState().messages['1']?.revoked).toBe(true);
  expect(controller.store.getState().revokeState['1']).toBeUndefined();
  controller.revoke('2', 'self');
  receive({ type: 'revoke', id: '2' });
  stop();
  expect(close).toHaveBeenCalledOnce();
  expect(controller.store.getState().ids).toEqual([]);
  expect(vi.getTimerCount()).toBe(0);
});
