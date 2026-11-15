import { afterEach, expect, test, vi } from 'vitest';
import { defaultIsland } from '@/domain/my-island';
import { createIslandController } from './controller';

afterEach(() => vi.useRealTimers());
test('debounces saves, keeps module references and flushes on disposal', () => {
  vi.useFakeTimers();
  const write = vi.fn();
  const controller = createIslandController({ read: defaultIsland, write }, 'synthetic-a');
  const tasks = controller.store.getState().data.tasks;
  controller.update({ note: 'first' });
  controller.update({ note: 'latest' });
  expect(controller.store.getState().data.tasks).toBe(tasks);
  expect(write).not.toHaveBeenCalled();
  vi.advanceTimersByTime(400);
  expect(write).toHaveBeenCalledTimes(1);
  expect(write).toHaveBeenLastCalledWith(
    'synthetic-a',
    expect.objectContaining({ note: 'latest' }),
  );
  controller.update({ motto: 'keep this' });
  controller.dispose();
  expect(write).toHaveBeenCalledTimes(2);
  expect(controller.store.getState().status).toBe('saved');
});
test('retains edits when storage fails and retries only on request', () => {
  vi.useFakeTimers();
  let fail = true;
  const write = vi.fn(() => {
    if (fail) throw new Error('quota');
  });
  const controller = createIslandController(
    {
      read: () => {
        throw new Error('unavailable');
      },
      write,
    },
    'synthetic-b',
  );
  expect(controller.store.getState().status).toBe('error');
  controller.update({ note: 'keep local draft' });
  vi.advanceTimersByTime(400);
  expect(controller.store.getState()).toMatchObject({
    status: 'error',
    data: { note: 'keep local draft' },
  });
  vi.advanceTimersByTime(10000);
  expect(write).toHaveBeenCalledTimes(1);
  fail = false;
  controller.flush();
  expect(controller.store.getState().status).toBe('saved');
});
