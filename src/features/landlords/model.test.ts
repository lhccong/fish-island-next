import { expect, it, vi } from 'vitest';
import type { LandlordsEvent, LandlordsPort } from '@/domain/landlords';
import { createLandlordsModel } from './model';
it('操作串行，失败保留手牌，忽略其他房间，超时可恢复，卸载不隐式退出', () => {
  vi.useFakeTimers();
  let emit: (e: LandlordsEvent) => void = () => {};
  const send = vi.fn(() => true);
  const port: LandlordsPort = {
    connected: () => true,
    send,
    subscribe: (event) => {
      emit = event;
      return vi.fn();
    },
  };
  const model = createLandlordsModel(port, '1');
  const stop = model.start(vi.fn());
  model.enter('room');
  emit({
    type: 'state',
    action: 'JOIN',
    patch: { roomId: 'room', hand: ['♠3', '♥4'], phase: 'playing' },
  });
  expect(model.send('gamePlayCards', { pokers: ['♠3'] })).toBe(true);
  expect(model.send('gamePlayCards', { pokers: ['♠3'] })).toBe(false);
  emit({ type: 'state', action: 'gameStateUpdate', patch: { roomId: 'other', hand: [] } });
  emit({ type: 'error', message: '合成失败' });
  expect(model.getSnapshot().table.hand).toEqual(['♠3', '♥4']);
  expect(model.getSnapshot().error).toBe('合成失败');
  model.send('gamePass');
  vi.advanceTimersByTime(12001);
  expect(model.getSnapshot().pending).toBe('');
  expect(model.getSnapshot().error).toContain('超时');
  stop();
  expect(send.mock.calls.flat()).not.toContain('gameLeaveRoom');
  vi.useRealTimers();
});
