import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPetClient } from './client';
import { challenger, companion, forge, image, item, number, round } from './decode';

const token = () => ({ name: 'synthetic-session', value: 'synthetic-value' });
const pet = { petId: '17', name: '测试伙伴', petUrl: '', level: 2, hunger: 60, mood: 70 };
afterEach(() => vi.unstubAllGlobals());
describe('pet protocol migration', () => {
  it('keeps safe owner and pet avatars across all four ranking protocols', async () => {
    const entry = {
      userId: '124',
      petId: '18',
      name: '栗栗',
      petName: '栗栗',
      userName: '岛友',
      userAvatar: 'https://example.test/avatar.png',
      petAvatar: 'https://example.test/pet.png',
      petUrl: 'https://example.test/pet.png',
      rank: 1,
      damage: 125,
      maxFloor: 3,
      petLevel: 9,
    };
    const fetcher = vi
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve(
          new Response(
            JSON.stringify({ code: 0, data: url.includes('/my/rank') ? null : [entry] }),
          ),
        ),
      );
    vi.stubGlobal('fetch', fetcher);
    const client = createPetClient('', token, vi.fn());
    const signal = new AbortController().signal;
    expect((await client.bossRanks('91', signal))[0]).toMatchObject({
      avatar: entry.userAvatar,
      petUrl: entry.petAvatar,
    });
    expect((await client.ranks(signal))[0]).toMatchObject({
      ownerAvatar: entry.userAvatar,
      url: entry.petUrl,
    });
    expect((await client.towerRanks(signal))[0]).toMatchObject({ avatar: entry.userAvatar });
    expect((await client.tournament(signal)).ranks[0]).toMatchObject({
      ownerAvatar: entry.userAvatar,
    });
    entry.userAvatar = 'javascript:invalid';
    expect((await client.bossRanks('91', signal))[0]?.avatar).toBe('');
  });
  it('keeps a defeated boss at zero health and preserves its maximum', () => {
    expect(challenger({ id: '9', currentHealth: 0, maxHealth: 500 })).toMatchObject({
      health: 0,
      maxHealth: 500,
    });
  });
  it('decodes actual battle equipment and distinguishes absent data from empty slots', () => {
    const equipped = challenger({
      id: '9',
      equippedItems: {
        hand: {
          id: '508',
          enhanceLevel: 7,
          template: {
            id: '40',
            name: '苔纹护腕',
            icon: 'https://example.test/gear.png',
            equipSlot: 'hand',
          },
        },
        weapon: null,
      },
    });
    expect(equipped.equipment).toMatchObject([
      { slot: 'hand', item: { name: '苔纹护腕', level: 7, icon: 'https://example.test/gear.png' } },
    ]);
    expect(challenger({ id: '9' }).equipment).toBeUndefined();
    expect(challenger({ id: '9', equippedItems: {} }).equipment).toEqual([]);
  });
  it('maps tower floor, progress and ranking with the legacy query protocol', async () => {
    const fetcher = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            code: 0,
            data: url.includes('/floor?')
              ? { floor: 4, name: '守卫', health: 90 }
              : url.includes('/ranking?')
                ? [{ userId: '123', userName: '岛友', rank: 1, maxFloor: 3 }]
                : {
                    maxFloor: 3,
                    maxOpenFloor: 100,
                    nextFloor: 4,
                    completed: false,
                    nextMonster: { floor: 4, health: 90 },
                  },
          }),
        ),
      ),
    );
    vi.stubGlobal('fetch', fetcher);
    const client = createPetClient('https://example.test', token, vi.fn());
    const signal = new AbortController().signal;
    expect(await client.tower(signal)).toMatchObject({ floor: 3, maxOpenFloor: 100, nextFloor: 4 });
    expect(await client.towerFloor(4, signal)).toMatchObject({ id: '4', health: 90 });
    expect(await client.towerRanks(signal)).toEqual([
      { userId: '123', name: '岛友', avatar: '', rank: 1, floor: 3 },
    ]);
    expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
      'https://example.test/api/tower/progress',
      'https://example.test/api/tower/floor?floor=4',
      'https://example.test/api/tower/ranking?limit=20',
    ]);
  });
  it('preserves server entry grades and leaves missing or unknown grades unclassified', () => {
    for (const grade of [1, 2, 3, 4, 5])
      expect(
        forge({ entry1: { attr: 'attack', value: 10, grade: String(grade) } }).entries[0]?.grade,
      ).toBe(grade);
    for (const grade of [undefined, null, 0, 6])
      expect(forge({ entry1: { attr: 'attack', value: 10, grade } }).entries[0]?.grade).toBeNull();
  });
  it('normalizes legacy forge attribute aliases to the same Chinese names as companion stats', () => {
    const aliases = {
      maxHp: '生命',
      antiCrit: '暴击抵抗',
      antiDodge: '闪避抵抗',
      antiBlock: '格挡抵抗',
      antiCombo: '连击抵抗',
      antiLifesteal: '汲取抵抗',
    };
    for (const [attr, name] of Object.entries(aliases)) {
      expect(forge({ entry1: { attr, value: 0.0192 } }).entries[0]).toMatchObject({
        name,
        value: 0.0192,
      });
      expect(companion({ ...pet, equipStats: { [attr]: 0.0192 } }).stats).toEqual([[name, 0.0192]]);
    }
  });
  it('decodes decimal strings from item templates without losing images or accepting invalid numbers', () => {
    const template = {
      id: '40',
      icon: 'https://example.test/hat.png',
      rarity: '2',
      purchasePoint: '20.5',
      baseDefense: '4',
    };
    expect(item({ id: '501', template, enhanceLevel: '3', quantity: '1' }, true)).toMatchObject({
      icon: template.icon,
      rarity: 2,
      price: 20.5,
      level: 3,
      quantity: 1,
      stats: [['防御', 4]],
    });
    for (const value of ['', 'NaN', 'Infinity', '2px', {}, true])
      expect(() => number(value)).toThrow('数值异常');
  });
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
