import { afterEach, expect, it, vi } from 'vitest';
import type { ChatEvent, ChatRealtimePort } from '@/domain/chat';
import { createChatRealtimeController } from './realtime-controller';

afterEach(() => vi.useRealTimers());
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
