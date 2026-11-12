import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPetClient } from './client';
import { companion, image, round } from './decode';

const token = () => ({ name: 'synthetic-session', value: 'synthetic-value' });
const pet = { petId: '17', name: '测试伙伴', petUrl: '', level: 2, hunger: 60, mood: 70 };
afterEach(() => vi.unstubAllGlobals());
describe('pet protocol migration', () => {
  it('preserves the required identifiers in rename and other-profile requests', async () => {
    const fetcher = vi
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve(
          new Response(JSON.stringify({ code: 0, data: url.includes('/other?') ? null : true })),
        ),
      );
    vi.stubGlobal('fetch', fetcher);
    const client = createPetClient('https://example.test', token, vi.fn());
    const signal = new AbortController().signal;
    await client.rename('17', '测试伙伴', signal);
    expect(JSON.parse((fetcher.mock.calls[0]![1] as RequestInit).body as string)).toEqual({
      petId: '17',
      name: '测试伙伴',
    });
    await client.other('124', signal);
    expect(fetcher.mock.calls[1]![0]).toBe('https://example.test/api/pet/other?otherUserId=124');
  });
  it('keeps legacy double-api paths and sends the current credential in headers', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ code: 0, data: { records: [], total: 0 } })),
      );
    vi.stubGlobal('fetch', fetcher);
    const client = createPetClient('https://example.test/', token, vi.fn());
    await client.skins(2, new AbortController().signal);
    expect(fetcher.mock.calls[0]![0]).toBe(
      'https://example.test/api/api/pet/skin/list?current=2&pageSize=12',
    );
    expect((fetcher.mock.calls[0]![1] as RequestInit).headers).toEqual(
      new Headers({ 'synthetic-session': 'synthetic-value' }),
    );
  });
  it('treats null as an empty camp and rejects malformed pets', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 0, data: null }))),
    );
    expect(await createPetClient('', token, vi.fn()).mine(new AbortController().signal)).toBeNull();
    expect(() => companion({ ...pet, petId: {} })).toThrow('编号');
    expect(companion(pet).name).toBe('测试伙伴');
    expect(image('javascript:alert(1)')).toBe('');
  });
  it('does not turn failed server operations into successful care', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ code: 40000, message: '尚在冷却，请稍后重试' })),
        ),
    );
    await expect(
      createPetClient('', token, vi.fn()).care('feed', '17', new AbortController().signal),
    ).rejects.toThrow('尚在冷却');
  });
  it('invalidates expired sessions and decodes authoritative rounds', async () => {
    const expired = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));
    await expect(
      createPetClient('', token, expired).mine(new AbortController().signal),
    ).rejects.toThrow('过期');
    expect(expired).toHaveBeenCalledOnce();
    expect(
      round({
        attackerType: 'MY_PET',
        damage: 12,
        myPetRemainingHealth: 80,
        opponentPetRemainingHealth: 0,
      }).opponentHealth,
    ).toBe(0);
    expect(() => round({ attackerType: 'unknown' })).toThrow('攻击方');
  });
});
