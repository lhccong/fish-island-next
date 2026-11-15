import { afterEach, expect, it, vi } from 'vitest';
import { createPetClient } from './client';

afterEach(() => vi.unstubAllGlobals());
it('reads the auto-enrolling leaderboard before requesting my rank', async () => {
  let enrolled = false;
  const fetcher = vi.fn(async (url: string) => {
    if (url.endsWith('/leaderboard')) {
      await Promise.resolve();
      enrolled = true;
      return new Response(JSON.stringify({ code: 0, data: [] }));
    }
    expect(enrolled).toBe(true);
    return new Response(JSON.stringify({ code: 0, data: 1 }));
  });
  vi.stubGlobal('fetch', fetcher);
  const client = createPetClient('', () => ({ name: 'test-session', value: 'synthetic' }), vi.fn());
  expect(await client.tournament(new AbortController().signal)).toEqual({ ranks: [], mine: 1 });
});
it('posts a target rank and accepts empty-slot settlement without battle rounds', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ code: 0, data: { isWin: true, myRank: 3, rounds: [] } })),
    );
  vi.stubGlobal('fetch', fetcher);
  const client = createPetClient('', () => ({ name: 'test-session', value: 'synthetic' }), vi.fn());
  expect(await client.compete(3, new AbortController().signal)).toEqual({
    win: true,
    rank: 3,
    rounds: [],
  });
  expect(fetcher.mock.calls[0]![0]).toBe('/api/pet/tournament/challenge?targetRank=3');
  expect(fetcher.mock.calls[0]![1]).toMatchObject({ method: 'POST' });
});
