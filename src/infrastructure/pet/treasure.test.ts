import { describe, expect, it, vi } from 'vitest';
import { createTreasureClient, decodeTreasure } from './treasure';

const snapshot = {
  serverNow: 10000,
  resetAt: 86400000,
  nextAvailableAt: 0,
  used: 0,
  active: null,
  lastReward: null,
};
describe('treasure protocol boundary', () => {
  it('rejects invalid counts, timestamps, unknown sites and client-looking rewards', () => {
    for (const value of [
      { ...snapshot, used: 6 },
      { ...snapshot, used: -1 },
      { ...snapshot, resetAt: NaN },
      { ...snapshot, active: { id: 'a', siteId: 'unknown', readyAt: 15000 } },
      { ...snapshot, lastReward: { id: 'a', siteId: 'grove', points: 11 } },
      { ...snapshot, lastReward: { id: 'a', siteId: 'grove', points: 0 } },
    ])
      expect(() => decodeTreasure(value)).toThrow();
    expect(decodeTreasure(snapshot)).toEqual(snapshot);
  });
  it('normalizes actual JsonConfig long strings for ready, active and settled responses', () => {
    const wire = {
      ...snapshot,
      serverNow: '1794873600000',
      resetAt: '1794931200000',
      nextAvailableAt: '0',
    };
    expect(decodeTreasure(wire)).toEqual({
      ...snapshot,
      serverNow: 1794873600000,
      resetAt: 1794931200000,
    });
    expect(
      decodeTreasure({
        ...wire,
        used: 1,
        nextAvailableAt: '1794877205000',
        active: { id: 'dig', siteId: 'grove', readyAt: '1794873605000' },
      }),
    ).toMatchObject({
      used: 1,
      nextAvailableAt: 1794877205000,
      active: { id: 'dig', siteId: 'grove', readyAt: 1794873605000 },
    });
    expect(
      decodeTreasure({
        ...wire,
        used: 1,
        nextAvailableAt: '1794877205000',
        lastReward: { id: 'dig', siteId: 'grove', points: 7 },
      }),
    ).toMatchObject({
      nextAvailableAt: 1794877205000,
      lastReward: { id: 'dig', siteId: 'grove', points: 7 },
    });
  });
  it('rejects malformed, missing and unsafe timestamps without coercing counts or rewards', () => {
    for (const invalid of [
      '',
      ' ',
      ' 10000',
      '+10000',
      '-1',
      '1e4',
      '1.5',
      '001',
      '9007199254740993',
      null,
      undefined,
      true,
    ]) {
      expect(() => decodeTreasure({ ...snapshot, serverNow: invalid })).toThrow();
      expect(() => decodeTreasure({ ...snapshot, nextAvailableAt: invalid })).toThrow();
      expect(() =>
        decodeTreasure({ ...snapshot, active: { id: 'dig', siteId: 'grove', readyAt: invalid } }),
      ).toThrow();
    }
    expect(() => decodeTreasure({ ...snapshot, used: '1' })).toThrow();
    expect(() =>
      decodeTreasure({ ...snapshot, lastReward: { id: 'dig', siteId: 'grove', points: '7' } }),
    ).toThrow();
  });
  it('only sends the site and server-issued operation identity, never reward or client time', async () => {
    const request = vi.fn().mockResolvedValue(snapshot);
    const client = createTreasureClient(request);
    const signal = new AbortController().signal;
    await client.treasureStatus(signal);
    await client.startTreasure('grove', signal);
    await client.finishTreasure('server-dig-id', signal);
    expect(request.mock.calls).toEqual([
      ['pet/treasure/status', signal],
      ['pet/treasure/start', signal, { siteId: 'grove' }],
      ['pet/treasure/finish', signal, { id: 'server-dig-id' }],
    ]);
  });
});
