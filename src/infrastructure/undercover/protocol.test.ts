import { expect, it, vi } from 'vitest';
import { createUndercoverChannel, decodeUndercoverEvent } from './channel';
import { room } from './decode';
const message = {
  id: '1',
  roomId: 'room-1',
  content: '圆圆的',
  timestamp: '2026-11-14T08:00:00Z',
  sender: { id: '123', name: '合成玩家' },
};
it('requires explicit room IDs, tolerates other game frames and rejects malformed frames', () => {
  expect(
    decodeUndercoverEvent(JSON.stringify({ type: 'undercover', data: { message } })),
  ).toMatchObject({ type: 'message', message: { roomId: 'room-1' } });
  expect(
    decodeUndercoverEvent({
      type: 'undercover',
      data: { message: { ...message, roomId: undefined } },
    }),
  ).toBeNull();
  expect(decodeUndercoverEvent('{broken')).toBeNull();
  expect(decodeUndercoverEvent({ type: 'chat', data: { message } })).toBeNull();
  expect(
    decodeUndercoverEvent({ type: 'countdown', data: { roomId: 'room-1', time: -1 } }),
  ).toBeNull();
  expect(decodeUndercoverEvent({ type: 'refreshRoom', data: '' })).toEqual({
    type: 'refresh',
    roomId: null,
  });
});
it('normal mode never forwards a role; preserves speaking order and numeric ID safety', () => {
  const decoded = room({
    roomId: 'r1',
    creatorId: '123',
    status: 'PLAYING',
    role: 'undercover',
    gameMode: 1,
    participants: [{ userId: '123' }, { userId: '456' }],
    orderedParticipantIds: ['456', '123'],
  });
  expect(decoded.role).toBeNull();
  expect(decoded.players.map((p) => p.id)).toEqual(['456', '123']);
  expect(() =>
    room({ roomId: Number.MAX_SAFE_INTEGER + 1, status: 'WAITING', creatorId: '123' }),
  ).toThrow();
});
it('uses the existing sender, reports offline failure, and releases listeners', () => {
  const relay = createUndercoverChannel();
  const event = vi.fn();
  const stop = relay.port.subscribe(event);
  const outgoing = {
    id: 'm1',
    roomId: 'r1',
    senderId: '123',
    name: '合成玩家',
    content: '水果',
    time: 1,
  };
  expect(relay.port.send(outgoing, null)).toBe(false);
  const send = vi.fn(() => true);
  relay.connection('connected', send);
  expect(relay.port.send(outgoing, null)).toBe(true);
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 2,
      userId: '123',
      data: expect.objectContaining({ type: 'undercover' }),
    }),
  );
  stop();
  event.mockClear();
  relay.receive({ type: 'refreshRoom', data: '' });
  expect(event).not.toHaveBeenCalled();
  relay.connection('offline', null);
  expect(relay.port.send(outgoing, null)).toBe(false);
});
