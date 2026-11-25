import { afterEach, expect, it, vi } from 'vitest';
import { createAuthClient } from './client';

afterEach(() => vi.unstubAllGlobals());
const values = {
  account: '',
  name: '  岛上的鱼  ',
  email: 'synthetic@example.com',
  password: 'synthetic-password',
  confirmPassword: 'synthetic-password',
  code: '123456',
};

it('uses anonymous legacy email registration contracts without creating a session', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ code: 0, data: true })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ code: 0, data: '1234567890123456789' })));
  vi.stubGlobal('fetch', fetcher);
  const client = createAuthClient('https://example.com');
  const signal = new AbortController().signal;
  await client.sendRegistrationCode(values.email, signal);
  await client.register(values, signal);
  expect(fetcher.mock.calls[0]?.[0]).toBe('https://example.com/api/user/email/send');
  expect(fetcher.mock.calls[1]?.[0]).toBe('https://example.com/api/user/email/register');
  expect(JSON.parse(fetcher.mock.calls[1]?.[1].body as string)).toEqual({
    userAccount: '',
    userName: '岛上的鱼',
    email: values.email,
    userPassword: values.password,
    checkPassword: values.confirmPassword,
    code: values.code,
  });
  expect(fetcher.mock.calls[1]?.[1].headers.get('Content-Type')).toBe('application/json');
  expect(fetcher.mock.calls[1]?.[1].headers.has('satoken')).toBe(false);
});

it('omits a blank nickname so the server can assign one', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 0, data: '123' })));
  vi.stubGlobal('fetch', fetcher);
  await createAuthClient('').register({ ...values, name: ' 　' }, new AbortController().signal);
  expect(JSON.parse(fetcher.mock.calls[0]?.[1].body as string)).not.toHaveProperty('userName');
});

it.each([null, false, 0, -1, {}, '', '0'])(
  'rejects unconfirmed registration response %j',
  async (data) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 0, data }))),
    );
    await expect(
      createAuthClient('').register(values, new AbortController().signal),
    ).rejects.toThrow('未确认注册成功');
  },
);

it('preserves server rejection and does not confirm failed code sends', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 40000, message: '验证码错误' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 0, data: false }))),
  );
  const client = createAuthClient('');
  await expect(client.register(values, new AbortController().signal)).rejects.toThrow('验证码错误');
  await expect(
    client.sendRegistrationCode(values.email, new AbortController().signal),
  ).rejects.toThrow('未确认验证码发送成功');
});
