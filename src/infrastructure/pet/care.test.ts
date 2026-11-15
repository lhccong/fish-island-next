import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPetClient } from './client';

const token = () => ({ name: 'synthetic-session', value: 'synthetic-value' });
const pet = { petId: '17', name: '测试伙伴', petUrl: '', level: 2, hunger: 60, mood: 70 };
afterEach(() => vi.unstubAllGlobals());
describe('pet care protocol', () => {
  it.each(['feed', 'pat'] as const)(
    'decodes %s as care state without inventing empty equipment or stats',
    async (action) => {
      const fetcher = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 0,
            data: {
              ...pet,
              level: 3,
              exp: 136,
              hunger: 90,
              mood: 95,
              equipStats: null,
              equippedItems: null,
            },
          }),
        ),
      );
      vi.stubGlobal('fetch', fetcher);
      const result = await createPetClient('', token, vi.fn()).care(
        action,
        '17',
        new AbortController().signal,
      );
      expect(result).toEqual({ id: '17', level: 3, exp: 136, hunger: 90, mood: 95 });
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );
});
