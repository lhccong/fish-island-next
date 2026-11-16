import { expect, test } from 'vitest';
import { createBroadcastQueue } from './queue';

const event = (id: string) => ({ id, content: `合成播报 ${id}`, publishedAt: 1794800000000 });
test('queues in order, ignores duplicates after dismissal and stale dismissals', () => {
  const queue = createBroadcastQueue();
  queue.enqueue(event('1'));
  queue.enqueue(event('1'));
  queue.enqueue(event('2'));
  queue.dismiss('2');
  expect(queue.getSnapshot().map((v) => v.id)).toEqual(['1', '2']);
  queue.dismiss('1');
  queue.enqueue(event('1'));
  expect(queue.getSnapshot().map((v) => v.id)).toEqual(['2']);
});
test('bounds pending and remembered events and releases subscriptions', () => {
  const queue = createBroadcastQueue();
  let updates = 0;
  const stop = queue.subscribe(() => updates++);
  for (let i = 0; i < 250; i++) queue.enqueue(event(String(i)));
  expect(queue.getSnapshot()).toHaveLength(20);
  expect(updates).toBe(20);
  stop();
  for (let i = 0; i < 20; i++) queue.dismiss(String(i));
  queue.enqueue(event('249'));
  expect(queue.getSnapshot()).toHaveLength(0);
  queue.enqueue(event('0'));
  expect(queue.getSnapshot()).toHaveLength(1);
  expect(updates).toBe(20);
});
