import { expect, it, vi } from 'vitest';
import { createPetActivities } from './activities';

it('matches draw results by pool entry rather than equipment template and preserves progress', async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce({
      id: 3,
      costPoints: 100,
      guaranteeCount: 300,
      userProgress: { totalDrawCount: 8, lastDrawTime: '2026-11-15 09:00' },
      prizeList: [{ id: 9, prizeId: 101, name: '法杖', quality: 4 }],
    })
    .mockResolvedValueOnce({
      costPoints: 0,
      prizeList: [{ turntablePrizeId: 9, prizeId: 101, name: '法杖' }],
    });
  const api = createPetActivities(request);
  const signal = new AbortController().signal;
  const pool = await api.supply('3', signal);
  const result = await api.draw('3', 1, signal);
  expect(pool.prizes[0]?.prizeKey).toBe(result.prizes[0]?.prizeKey);
  expect(pool.progress).toEqual({ total: 8, lastDrawTime: '2026-11-15 09:00' });
  expect(result.cost).toBe(0);
});

it('reads global latest records for daily free eligibility and scopes displayed records to the chosen pool', async () => {
  const request = vi.fn().mockResolvedValue({ records: [], total: 0 });
  const api = createPetActivities(request);
  const signal = new AbortController().signal;
  await api.drawRecords(1, signal);
  await api.drawRecords(2, signal, '4');
  const global = new URL(request.mock.calls[0]![0], 'https://test.local');
  const scoped = new URL(request.mock.calls[1]![0], 'https://test.local');
  expect(global.searchParams.has('turntableId')).toBe(false);
  expect(global.searchParams.get('sortOrder')).toBe('descend');
  expect(scoped.searchParams.get('turntableId')).toBe('4');
  expect(scoped.searchParams.get('current')).toBe('2');
});
