import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSignInClient } from './client';
import { decodeMonth } from './decode';
import { shiftMonth } from '@/domain/sign-in';

afterEach(() => vi.unstubAllGlobals());
describe('签到协议', () => {
  it('保留跨年月份与闰年日历', () => {
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    const data = {
      year: 2024,
      month: 2,
      continuousDays: 0,
      totalSignInDays: 0,
      currentPoints: 0,
      remainMakeUpCount: 3,
      days: [
        {
          day: 29,
          date: '2024-02-29',
          rewardPoints: 10,
          signed: false,
          isToday: false,
          canMakeUp: false,
          signType: null,
        },
      ],
    };
    expect(decodeMonth(data).days[0]!.day).toBe(29);
    expect(() => decodeMonth({ ...data, year: 2026 })).toThrow();
    expect(() => decodeMonth({ ...data, days: [...data.days, ...data.days] })).toThrow();
    expect(() => decodeMonth({ ...data, currentPoints: '0' })).toThrow();
  });
  it('签到与补签按原协议发送，使用服务端奖励', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ code: 0, data: { totalPoints: 15, bonusPoints: 5, nextDayBonus: 8 } }),
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const port = createSignInClient(
      'https://sign.test/',
      () => ({ name: 'synthetic-session', value: 'synthetic' }),
      vi.fn(),
    );
    expect((await port.sign(new AbortController().signal)).totalPoints).toBe(15);
    expect(fetchMock.mock.calls[0]![0]).toBe('https://sign.test/api/user/signIn');
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ method: 'POST', body: '{}' });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ code: 0, data: { totalPoints: 10, bonusPoints: 0, nextDayBonus: 0 } }),
      ),
    );
    await port.makeUp('2026-11-13', new AbortController().signal);
    expect(fetchMock.mock.calls[1]![1].body).toBe('{"signDate":"2026-11-13"}');
  });
  it('过期账号通知应用，拒绝伪成功和错误响应', async () => {
    const expired = vi.fn();
    const port = createSignInClient(
      'https://sign.test',
      () => ({ name: 'synthetic-session', value: 'synthetic' }),
      expired,
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 40100 }))),
    );
    await expect(port.status(new AbortController().signal)).rejects.toThrow('登录已过期');
    expect(expired).toHaveBeenCalledOnce();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 0, data: true }))),
    );
    await expect(port.sign(new AbortController().signal)).rejects.toThrow();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 50000, message: '积分不足' }))),
    );
    await expect(port.makeUp('2026-11-13', new AbortController().signal)).rejects.toThrow(
      '积分不足',
    );
  });
});
