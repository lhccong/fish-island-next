import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { LuckyBagDetail, LuckyBagPort, ReceivedMessage } from '@/domain/chat';
import { createActiveLuckyBags } from './lucky-bag-active';
import { createChatRealtimeController } from './realtime-controller';
import { createLuckyBagController } from './lucky-bag-controller';
import { createLuckyBagCreation } from './lucky-bag-creation';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-14T12:00:00Z'));
});
afterEach(() => vi.useRealTimers());
const bag = (id: string, patch: Partial<LuckyBagDetail> = {}): LuckyBagDetail => ({
  id,
  name: '合成福袋',
  creatorName: '合成岛友',
  type: 1,
  status: 0,
  joined: false,
  totalAmount: 50,
  winnerCount: 5,
  participantCount: 0,
  drawTime: Date.now() + 60000,
  ...patch,
});
function setup() {
  const port: LuckyBagPort = {
    active: vi.fn().mockResolvedValue([]),
    detail: vi.fn(),
    join: vi.fn().mockResolvedValue(undefined),
    create: vi.fn(),
    records: vi.fn(),
  };
  const chat = createChatRealtimeController({ connect: vi.fn() });
  let incoming: ((message: ReceivedMessage) => void) | undefined;
  vi.spyOn(chat, 'subscribeIncoming').mockImplementation((listener) => {
    incoming = listener;
    return () => {
      incoming = undefined;
    };
  });
  const controller = createActiveLuckyBags(port, 'synthetic');
  const push = (content: string, senderId = 'other') =>
    incoming?.({
      id: 'synthetic-message',
      senderId,
      senderName: '合成',
      content,
      createdAt: Date.now(),
      revoked: false,
    });
  return { port, chat, controller, push };
}
it('counts only distinct, unjoined live bags and expires locally without a new request', async () => {
  const f = setup();
  vi.mocked(f.port.active).mockResolvedValue([
    bag('a'),
    bag('a'),
    bag('joined', { joined: true }),
    bag('ended', { status: 1 }),
    bag('expired', { drawTime: Date.now() - 1 }),
    bag('b', { drawTime: Date.now() + 1000 }),
  ]);
  await f.controller.load();
  expect(f.controller.store.getState().count).toBe(2);
  await vi.advanceTimersByTimeAsync(1010);
  expect(f.controller.store.getState().count).toBe(1);
  await vi.advanceTimersByTimeAsync(60000);
  expect(f.controller.store.getState().count).toBe(0);
  expect(f.port.active).toHaveBeenCalledOnce();
  f.controller.dispose();
});
it('serializes refreshes and preserves participation and newly created bags over an old read', async () => {
  const f = setup();
  let resolve!: (value: readonly LuckyBagDetail[]) => void;
  vi.mocked(f.port.active)
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    )
    .mockResolvedValue([bag('a')]);
  const reading = f.controller.load();
  expect(f.controller.store.getState().loading).toBe(true);
  f.controller.update(bag('a', { joined: true }));
  f.controller.update(bag('new'));
  resolve([bag('a')]);
  await reading;
  expect(f.controller.store.getState().loading).toBe(false);
  expect(f.controller.store.getState().count).toBe(1);
  expect(f.controller.store.getState().bags.find((item) => item.id === 'a')?.joined).toBe(true);
  let release!: (value: readonly LuckyBagDetail[]) => void;
  vi.mocked(f.port.active).mockImplementationOnce(
    () =>
      new Promise((done) => {
        release = done;
      }),
  );
  const current = f.controller.load();
  void f.controller.load();
  void f.controller.load();
  expect(f.port.active).toHaveBeenCalledTimes(2);
  release([bag('a')]);
  await current;
  expect(f.port.active).toHaveBeenCalledTimes(3);
  await Promise.resolve();
  expect(f.controller.store.getState().count).toBe(0);
  f.controller.dispose();
});
it('keeps the previous badge on failure and only refreshes on relevant incoming events or reconnect', async () => {
  const f = setup();
  vi.mocked(f.port.active).mockResolvedValue([bag('a')]);
  f.controller.start(f.chat);
  await Promise.resolve();
  expect(f.controller.store.getState().count).toBe(1);
  f.push('普通消息');
  f.push('讨论福袋');
  await vi.advanceTimersByTimeAsync(200);
  expect(f.port.active).toHaveBeenCalledOnce();
  vi.mocked(f.port.active).mockRejectedValueOnce(new Error('读取失败'));
  f.push('[luckybag]new[/luckybag]');
  f.push('福袋已开奖', '-1');
  await vi.advanceTimersByTimeAsync(200);
  expect(f.port.active).toHaveBeenCalledTimes(2);
  expect(f.controller.store.getState()).toMatchObject({ count: 1, error: '读取失败' });
  await vi.advanceTimersByTimeAsync(1000);
  expect(f.port.active).toHaveBeenCalledTimes(2);
  f.chat.store.setState({ connection: 'connected' });
  await vi.advanceTimersByTimeAsync(200);
  expect(f.port.active).toHaveBeenCalledTimes(3);
  f.controller.dispose();
  f.push('[luckybag]new[/luckybag]');
  await vi.advanceTimersByTimeAsync(60000);
  expect(f.port.active).toHaveBeenCalledTimes(3);
});
it('cancels old account reads and does not request for guests', async () => {
  const f = setup();
  let signal: AbortSignal | undefined;
  vi.mocked(f.port.active).mockImplementation((_signal) => {
    signal = _signal;
    return new Promise(() => {});
  });
  f.controller.start(f.chat);
  f.controller.dispose();
  expect(signal?.aborted).toBe(true);
  const guest = createActiveLuckyBags(f.port, '');
  guest.start(f.chat);
  await guest.load();
  expect(f.port.active).toHaveBeenCalledOnce();
  guest.dispose();
});
it('updates the shared count immediately after participation and creation', async () => {
  const f = setup();
  const cache = createLuckyBagController(f.port, 'synthetic');
  vi.mocked(f.port.active).mockResolvedValue([bag('a')]);
  vi.mocked(f.port.detail).mockResolvedValue(bag('a'));
  await cache.active.load();
  const entry = cache.entry('a');
  await entry.load();
  await entry.join();
  expect(cache.active.store.getState().count).toBe(0);
  vi.mocked(f.port.create).mockResolvedValue(bag('new'));
  const creation = createLuckyBagCreation(f.port, 'synthetic', cache.active.update);
  await creation.submit('synthetic');
  expect(cache.active.store.getState().count).toBe(1);
  creation.dispose();
  cache.dispose();
  f.controller.dispose();
});
