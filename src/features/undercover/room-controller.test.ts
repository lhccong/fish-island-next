import { expect, it, vi } from 'vitest';
import type { UndercoverPort, UndercoverRoom, UndercoverEvent } from '@/domain/undercover';
import { createRoomController } from './room-controller';
import { appendRoomMessage } from './messages';
const room: UndercoverRoom = {
  id: 'r1',
  status: 'WAITING',
  creatorId: '123',
  creatorName: '合成玩家',
  players: [
    { id: '123', name: '合成玩家', avatar: null, eliminated: false, votes: 0, guessesLeft: 3 },
  ],
  maxPlayers: 6,
  mode: 1,
  word: '',
  role: null,
  result: '',
  votes: [],
};
function setup() {
  const service: UndercoverPort = {
    rooms: vi.fn(async () => [room]),
    room: vi.fn(async () => room),
    create: vi.fn(async () => 'r2'),
    action: vi.fn(async () => {}),
    vote: vi.fn(async () => {}),
    guess: vi.fn(async () => false),
  };
  let listener: ((event: UndercoverEvent) => void) | undefined;
  const realtime = {
    connected: () => true,
    subscribe: (fn: (event: UndercoverEvent) => void) => {
      listener = fn;
      return () => {
        listener = undefined;
      };
    },
    send: () => true,
  };
  const controller = createRoomController(service, realtime, '123');
  return { service, controller, emit: (event: UndercoverEvent) => listener?.(event) };
}
it('restores membership, preserves loaded content on failure and requires manual retry', async () => {
  const { service, controller } = setup();
  const stop = controller.start();
  await vi.waitFor(() => expect(controller.store.getState().status).toBe('ready'));
  expect(controller.store.getState().activeId).toBe('r1');
  vi.mocked(service.rooms).mockRejectedValueOnce(new Error('暂时断网'));
  await controller.refresh();
  expect(controller.store.getState()).toMatchObject({ status: 'error', room, error: '暂时断网' });
  await controller.refresh();
  expect(controller.store.getState().status).toBe('ready');
  stop();
});
it('does not allow an old room request to overwrite a newly selected room', async () => {
  const { service, controller } = setup();
  const stop = controller.start();
  await vi.waitFor(() => expect(controller.store.getState().status).toBe('ready'));
  let release!: (room: UndercoverRoom) => void;
  vi.mocked(service.room).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const old = controller.refresh();
  await vi.waitFor(() => expect(release).toBeDefined());
  controller.select('r2');
  vi.mocked(service.room).mockResolvedValue({ ...room, id: 'r2' });
  release(room);
  await old;
  await vi.waitFor(() => expect(controller.store.getState().status).toBe('ready'));
  expect(controller.store.getState().activeId).toBe('r2');
  stop();
});
it('serializes mutations, keeps a failed vote retryable, and cancels on stop', async () => {
  const { service, controller } = setup();
  const stop = controller.start();
  await vi.waitFor(() => expect(controller.store.getState().status).toBe('ready'));
  vi.mocked(service.vote).mockRejectedValueOnce(new Error('投票失败'));
  expect(await controller.vote('456')).toBe(false);
  expect(controller.store.getState().actionError).toBe('投票失败');
  expect(await controller.vote('456')).toBe(true);
  stop();
  expect(await controller.action('quit', 'r1')).toBe(false);
});
it('deduplicates per sender, rejects other rooms and bounds message memory', () => {
  const message = {
    id: '1',
    roomId: 'r1',
    senderId: '123',
    name: '合成玩家',
    content: '水果',
    time: 1,
  };
  const initial = [message];
  expect(appendRoomMessage(initial, message, 'r1')).toBe(initial);
  expect(appendRoomMessage(initial, { ...message, roomId: 'r2' }, 'r1')).toBe(initial);
  const many = Array.from({ length: 300 }, (_, i) => ({ ...message, id: String(i) }));
  const next = appendRoomMessage(many, { ...message, id: '300' }, 'r1');
  expect(next).toHaveLength(300);
  expect(next[0]?.id).toBe('1');
});
