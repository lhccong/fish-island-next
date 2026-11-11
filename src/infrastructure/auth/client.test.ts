import { afterEach, expect, it, vi } from 'vitest';
import { createAuthClient } from './client';
import { decodeToken, decodeUser, unwrap } from './decode';

const user = {
  id: '123',
  userName: '测试用户',
  userAvatar: 'https://example.com/avatar.png',
  userRole: 'user',
  saTokenInfo: { tokenName: 'test-session', tokenValue: 'synthetic-test-value' },
};
afterEach(() => vi.unstubAllGlobals());

it('does not mistake a permission denial for an expired credential', () => {
  try {
    unwrap({ code: 40101, message: '无权限' });
    throw new Error('expected failure');
  } catch (error) {
    expect(error).toMatchObject({ kind: 'rejected', message: '无权限' });
  }
});

it('uses the account and email login contracts without changing the password', async () => {
  const request = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ code: 0, data: user }))),
    );
  vi.stubGlobal('fetch', request);
  const client = createAuthClient('https://example.com');
  const signal = new AbortController().signal;
  await client.login({ account: 'test-account', password: 'test-password ' }, signal);
  expect(request.mock.calls[0]?.[0]).toBe('https://example.com/api/user/login');
  expect(JSON.parse(request.mock.calls[0]?.[1].body as string)).toEqual({
    userAccount: 'test-account',
    userPassword: 'test-password ',
  });
  await client.login({ account: 'test@example.com', password: 'test-password' }, signal);
  expect(request.mock.calls[1]?.[0]).toBe('https://example.com/api/user/email/login');
  expect(JSON.parse(request.mock.calls[1]?.[1].body as string)).toEqual({
    email: 'test@example.com',
    userPassword: 'test-password',
  });
});

it('restores using the server-defined token header and recognizes invalid sessions', async () => {
  const request = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ code: 40100, message: '未登录' })));
  vi.stubGlobal('fetch', request);
  await expect(
    createAuthClient('https://example.com').current(
      { name: 'test-session', value: 'synthetic-test-value' },
      new AbortController().signal,
    ),
  ).rejects.toMatchObject({ kind: 'unauthorized' });
  const options = request.mock.calls[0]?.[1] as RequestInit;
  expect(new Headers(options.headers).get('test-session')).toBe('synthetic-test-value');
  expect(options.credentials).toBe('include');
});

it('rejects incomplete sessions and executable avatar links', () => {
  expect(() => decodeToken({ tokenName: 'bad\r\nheader', tokenValue: 'test' })).toThrow();
  expect(() => decodeToken({ tokenName: 'test-session' })).toThrow();
  expect(() => decodeUser({ userName: '无 ID' })).toThrow();
  expect(decodeUser({ ...user, userAvatar: 'javascript:alert(1)' }).avatarUrl).toBeNull();
});
