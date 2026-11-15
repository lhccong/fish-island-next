import { afterEach, expect, it, vi } from 'vitest';
import { animateLottery } from './lottery-animation';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('visits the old nine-cell sequence and stops at the server-selected cell', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }), setTimeout, clearTimeout });
  const highlight = vi.fn();
  const task = animateLottery(8, new AbortController().signal, highlight);
  await vi.runAllTimersAsync();
  await task;
  expect(highlight.mock.calls.slice(0, 9).map(([index]) => index)).toEqual([
    0, 1, 2, 5, 8, 7, 6, 3, 4,
  ]);
  expect(highlight.mock.lastCall).toEqual([8]);
  expect(vi.getTimerCount()).toBe(0);
});
it('clears the active animation timer when the panel closes', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }), setTimeout, clearTimeout });
  const controller = new AbortController();
  const highlight = vi.fn();
  const task = animateLottery(4, controller.signal, highlight);
  const rejected = expect(task).rejects.toBeDefined();
  controller.abort();
  await rejected;
  await vi.runAllTimersAsync();
  expect(highlight).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
