import { afterEach, expect, it, vi } from 'vitest';
import { createAccountToolsClient } from './client';
afterEach(() => vi.unstubAllGlobals());
const signal = () => new AbortController().signal;
function fixture() {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const expired = vi.fn();
  const client = createAccountToolsClient(
    'https://example.test/',
    () => ({ name: 'synthetic', value: 'test' }),
    expired,
  );
  const reply = (data: unknown, code = 0) =>
    fetcher.mockResolvedValueOnce(
      new Response(JSON.stringify({ code, data, message: '合成错误' })),
    );
  return { client, fetcher, expired, reply };
}
it('uses the legacy body and query protocols without returning secrets in app lists', async () => {
  const { client, reply, fetcher } = fixture();
  reply([{ id: 1, appName: '合成应用', status: 1, clientSecret: 'must-not-leak' }]);
  const apps = await client.apps(signal());
  expect(apps[0]).not.toHaveProperty('clientSecret');
  reply('synthetic-reset');
  expect(await client.secret('1 &', true, signal())).toBe('synthetic-reset');
  expect(fetcher.mock.calls[1]?.[0]).toBe(
    'https://example.test/api/auth/app/reset-secret?id=1%20%26',
  );
  expect(fetcher.mock.calls[1]?.[1]).toMatchObject({ method: 'POST' });
  reply(true);
  await client.resetPassword(
    {
      email: 'test@example.test',
      code: 'synthetic',
      userPassword: 'synthetic-password',
      checkPassword: 'synthetic-password',
    },
    signal(),
  );
  const request = fetcher.mock.calls[2]?.[1] as RequestInit;
  expect(new Headers(request.headers).get('synthetic')).toBe('test');
  expect(JSON.parse(String(request.body))).toMatchObject({
    code: 'synthetic',
    checkPassword: 'synthetic-password',
  });
});
it('rejects false confirmations, malformed payloads, business failures and expired auth', async () => {
  const { client, reply, expired } = fixture();
  reply(false);
  await expect(client.sendCode('test@example.test', signal())).rejects.toThrow('未确认');
  reply({});
  await expect(client.apps(signal())).rejects.toThrow('列表格式');
  reply(null, 50000);
  await expect(client.redeem('synthetic', signal())).rejects.toThrow('合成错误');
  reply(null, 40100);
  await expect(client.apps(signal())).rejects.toThrow('过期');
  expect(expired).toHaveBeenCalledOnce();
});
it('surfaces network failure and never retries a redeem operation automatically', async () => {
  const { client, fetcher } = fixture();
  fetcher.mockRejectedValueOnce(new TypeError('synthetic'));
  await expect(client.redeem('synthetic', signal())).rejects.toThrow('检查网络');
  expect(fetcher).toHaveBeenCalledOnce();
});
