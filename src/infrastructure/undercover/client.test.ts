import { afterEach, expect, it, vi } from 'vitest';
import { createUndercoverClient } from './client';
afterEach(() => vi.unstubAllGlobals());
function setup(data: unknown, code = 0, status = 200) {
  const fetcher = vi.fn<typeof fetch>(
    async () => new Response(JSON.stringify({ code, data, message: '合成错误' }), { status }),
  );
  vi.stubGlobal('fetch', fetcher);
  const expired = vi.fn();
  return {
    port: createUndercoverClient(
      'https://undercover.test/',
      () => ({ name: 'test-session', value: 'synthetic-value' }),
      expired,
    ),
    fetcher,
    expired,
  };
}
it('preserves query POST for start/end/remove and JSON for join/vote', async () => {
  const { port, fetcher } = setup(true);
  const signal = new AbortController().signal;
  await port.action('start', 'room-1', signal);
  expect(fetcher.mock.calls[0]?.[0]).toBe(
    'https://undercover.test/api/undercover/room/start?roomId=room-1',
  );
  await port.action('join', 'room-1', signal);
  const options = (fetcher.mock.calls as unknown as [string, RequestInit][])[1]![1];
  expect(options.method).toBe('POST');
  expect(options.body).toBe('{"roomId":"room-1"}');
  expect(new Headers(options.headers).get('test-session')).toBe('synthetic-value');
});
it('does not report false action responses as success, but false guess is a valid result', async () => {
  const { port } = setup(false);
  const signal = new AbortController().signal;
  await expect(port.action('join', 'room-1', signal)).rejects.toThrow('未确认');
  await expect(port.guess('room-1', '香蕉', signal)).resolves.toBe(false);
});
it('notifies auth expiration and rejects malformed create IDs', async () => {
  const { port, expired } = setup(null, 40100);
  await expect(port.rooms(new AbortController().signal)).rejects.toThrow('登录已过期');
  expect(expired).toHaveBeenCalledOnce();
  const invalid = setup(null).port;
  await expect(
    invalid.create(
      { maxPlayers: 6, duration: 300, gameMode: 1, civilianWord: '', undercoverWord: '' },
      new AbortController().signal,
    ),
  ).rejects.toThrow('编号异常');
});
it('rejects HTTP errors and avoids a request when logged out', async () => {
  const { port, fetcher } = setup(null, 0, 503);
  await expect(port.rooms(new AbortController().signal)).rejects.toThrow('HTTP 503');
  const anonymous = createUndercoverClient('https://undercover.test', () => null, vi.fn());
  await expect(anonymous.rooms(new AbortController().signal)).rejects.toThrow('请先登录');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
