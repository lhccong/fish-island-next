import { expect, test } from 'vitest';
import { broadcastPlayback } from './playback';

test('short broadcasts stay fully visible for three seconds', () => {
  expect(broadcastPlayback(0, false, 12)).toMatchObject({ duration: 3000, scrollDuration: 0 });
});
test('long broadcasts keep constant speed and reserve time at both ends', () => {
  const plan = broadcastPlayback(400, false, 100);
  expect(plan.scrollDuration).toBe(10000);
  expect(plan.duration).toBe(12400);
  expect(broadcastPlayback(800, false, 200).scrollDuration).toBe(20000);
});
test('reduced motion gives longer static broadcasts time to be read', () => {
  expect(broadcastPlayback(0, true, 10).duration).toBe(3000);
  expect(broadcastPlayback(400, true, 150)).toMatchObject({ duration: 15000, scrollDuration: 0 });
});
