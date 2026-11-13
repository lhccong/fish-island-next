import { afterEach, expect, it, vi } from 'vitest';
import type { ChatHistoryPort, MessagePage, ReceivedMessage } from '@/domain/chat';
import { createHistoryController } from './history-controller';
import { createChatRealtimeController } from './realtime-controller';

const message = (id: string): ReceivedMessage => ({
  id,
  createdAt: Number(id),
  content: `合成${id}`,
  senderId: 'u',
  senderName: '合成',
  revoked: false,
});
afterEach(() => vi.useRealTimers());
it('reloads the latest page on each return, including a full window and a previous failure', async () => {
  vi.useFakeTimers();
  const load = vi.fn<ChatHistoryPort['loadHistory']>();
  load.mockResolvedValueOnce({ messages: [message('1')], nextCursor: '1' });
  load.mockRejectedValueOnce(new Error('刷新失败'));
  load.mockResolvedValueOnce({ messages: [message('2')], nextCursor: null });
  const merge = vi.fn();
  const history = createHistoryController({ loadHistory: load }, () => 1000, merge);
  const leave = history.activate();
  await vi.advanceTimersByTimeAsync(0);
  expect(history.store.getState()).toMatchObject({ limited: true, hasMore: false });
  leave();
  const leaveAgain = history.activate();
  await vi.advanceTimersByTimeAsync(0);
  expect(history.store.getState()).toMatchObject({ status: 'error', initialized: false });
  expect(merge).toHaveBeenCalledTimes(1);
  await history.loadMore();
  expect(load.mock.calls.map(([request]) => request.cursor)).toEqual([null, null, null]);
  expect(load.mock.calls.map(([request]) => request.limit)).toEqual([50, 50, 50]);
  expect(merge).toHaveBeenLastCalledWith([message('2')]);
  leaveAgain();
  expect(vi.getTimerCount()).toBe(0);
});

it('cancels on departure and rejects an old response after returning', async () => {
  vi.useFakeTimers();
  let resolve!: (page: MessagePage) => void;
  const load = vi.fn<ChatHistoryPort['loadHistory']>();
  load.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  load.mockResolvedValueOnce({ messages: [message('2')], nextCursor: null });
  const merge = vi.fn();
  const history = createHistoryController({ loadHistory: load }, () => 0, merge);
  const leave = history.activate();
  await vi.advanceTimersByTimeAsync(0);
  leave();
  expect(load.mock.calls[0]![0].signal?.aborted).toBe(true);
  const leaveAgain = history.activate();
  await vi.advanceTimersByTimeAsync(0);
  resolve({ messages: [message('1')], nextCursor: null });
  await Promise.resolve();
  expect(merge).toHaveBeenCalledExactlyOnceWith([message('2')]);
  leaveAgain();
});

it('merges delayed history with live messages and revoke tombstones without resurrection', async () => {
  let receive!: Parameters<Parameters<typeof createChatRealtimeController>[0]['connect']>[0];
  let resolve!: (page: MessagePage) => void;
  const client = createChatRealtimeController(
    {
      connect(onEvent) {
        receive = onEvent;
        return { close() {}, retry() {}, revoke: () => true };
      },
    },
    {
      loadHistory: () =>
        new Promise((done) => {
          resolve = done;
        }),
    },
  );
  const stop = client.start();
  const deactivate = client.history.activate();
  const load = client.history.loadMore();
  receive({ type: 'message', message: { ...message('2'), content: '实时优先' } });
  receive({ type: 'revoke', id: '1' });
  resolve({ messages: [message('1'), message('2'), message('2')], nextCursor: null });
  await load;
  expect(client.store.getState().ids).toEqual(['1', '2']);
  expect(client.store.getState().messages['1']).toMatchObject({ revoked: true, content: '' });
  expect(client.store.getState().messages['2']?.content).toBe('实时优先');
  deactivate();
  stop();
});
it('serializes requests, stops repeated pages and preserves content on retryable failures', async () => {
  const merge = vi.fn();
  const load = vi.fn<ChatHistoryPort['loadHistory']>();
  load.mockResolvedValueOnce({ messages: [message('50')], nextCursor: '50' });
  load.mockRejectedValueOnce(new Error('合成失败'));
  load.mockResolvedValueOnce({ messages: [message('50')], nextCursor: '50' });
  const history = createHistoryController({ loadHistory: load }, () => 1, merge);
  const deactivate = history.activate();
  await Promise.all([history.loadMore(), history.loadMore()]);
  expect(load).toHaveBeenCalledTimes(1);
  await history.loadMore();
  expect(history.store.getState()).toMatchObject({ status: 'error', hasMore: true });
  await history.loadMore();
  expect(history.store.getState()).toMatchObject({ status: 'ready', hasMore: false });
  await history.loadMore();
  expect(load).toHaveBeenCalledTimes(3);
  deactivate();
});
it('cancels account/page work, ignores late responses and reports the bounded window', async () => {
  let resolve!: (page: MessagePage) => void;
  const load = vi.fn<ChatHistoryPort['loadHistory']>(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const merge = vi.fn();
  let count = 0;
  const history = createHistoryController({ loadHistory: load }, () => count, merge);
  const deactivate = history.activate();
  const task = history.loadMore();
  history.reset();
  expect(load.mock.calls[0]?.[0].signal?.aborted).toBe(true);
  resolve({ messages: [message('1')], nextCursor: null });
  await task;
  expect(merge).not.toHaveBeenCalled();
  count = 999;
  load.mockResolvedValueOnce({ messages: [message('1')], nextCursor: '1' });
  await history.loadMore();
  count = 1000;
  await history.loadMore();
  expect(history.store.getState()).toMatchObject({ limited: true, hasMore: false });
  expect(load).toHaveBeenCalledTimes(2);
  deactivate();
});
