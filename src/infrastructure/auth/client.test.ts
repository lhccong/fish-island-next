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

it('uses legacy title, email and membership contracts and decodes their states', async () => {
  const request = vi.fn().mockImplementation((url: string) =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          code: 0,
          data: url.endsWith('/title/list')
            ? [{ titleId: 7, name: '合成称号' }]
            : url.endsWith('/vip/get/my')
              ? { type: 2, validDays: '', isExpired: false }
              : true,
        }),
      ),
    ),
  );
  vi.stubGlobal('fetch', request);
  const client = createAuthClient('https://example.com');
  const token = { name: 'synthetic-session', value: 'synthetic-value' };
  const signal = new AbortController().signal;
  expect(await client.titles(token, signal)).toEqual([{ id: '7', name: '合成称号' }]);
  expect(await client.membership(token, signal)).toMatchObject({ type: 2, permanent: true });
  await client.setTitle('-1', token, signal);
  await client.sendEmailCode('synthetic@example.com', token, signal);
  await client.bindEmail('synthetic@example.com', '654321', token, signal);
  expect(request.mock.calls[3]?.[0]).toBe('https://example.com/api/user/title/set?titleId=-1');
  expect(request.mock.calls[3]?.[1].method).toBe('POST');
  expect(JSON.parse(request.mock.calls[5]?.[1].body as string)).toEqual({
    email: 'synthetic@example.com',
    code: '654321',
  });
  const empty = vi
    .fn()
    .mockImplementation((url: string) =>
      Promise.resolve(
        new Response(JSON.stringify({ code: 0, data: url.endsWith('/my') ? null : false })),
      ),
    );
  vi.stubGlobal('fetch', empty);
  expect(await client.membership(token, signal)).toBeNull();
});

it('decodes editable profile data and rejects unconfirmed profile writes', async () => {
  expect(
    decodeUser({
      ...user,
      userProfile: '简介',
      momentsBgUrl: 'https://example.com/cover.png',
      email: 'synthetic@example.com',
    }),
  ).toMatchObject({
    profile: '简介',
    coverUrl: 'https://example.com/cover.png',
    email: 'synthetic@example.com',
  });
  expect(decodeUser({ ...user, momentsBgUrl: 'javascript:alert(1)' }).coverUrl).toBe('');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 0, data: false }))),
  );
  await expect(
    createAuthClient('https://example.com').updateProfile(
      { name: '新名称', profile: '', coverUrl: '', avatarUrl: '' },
      { name: 'synthetic-session', value: 'synthetic-value' },
      new AbortController().signal,
    ),
  ).rejects.toThrow('未确认');
});

it('maps profile updates and image uploads to legacy authenticated contracts', async () => {
  const request = vi.fn().mockImplementation((url: string) =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          code: 0,
          data: url.includes('/upload') ? 'https://example.com/image.png' : true,
        }),
      ),
    ),
  );
  vi.stubGlobal('fetch', request);
  const client = createAuthClient('https://example.com');
  const token = { name: 'test-session', value: 'synthetic-value' };
  const signal = new AbortController().signal;
  await client.updateProfile(
    { name: '新名称', profile: '简介', avatarUrl: '', coverUrl: '' },
    token,
    signal,
  );
  expect(request.mock.calls[0]?.[0]).toBe('https://example.com/api/user/update/my');
  const options = request.mock.calls[0]?.[1] as RequestInit;
  expect(JSON.parse(options.body as string)).toEqual({
    userName: '新名称',
    userProfile: '简介',
    userAvatar: '',
    momentsBgUrl: '',
  });
  expect(new Headers(options.headers).get(token.name)).toBe(token.value);
  expect(
    await client.uploadProfileImage(
      new File(['image'], 'avatar.png', { type: 'image/png' }),
      token,
      signal,
    ),
  ).toBe('https://example.com/image.png');
  expect(request.mock.calls[1]?.[0]).toBe(
    'https://example.com/api/file/minio/upload?biz=user_avatar',
  );
  const upload = request.mock.calls[1]?.[1] as RequestInit;
  expect(upload.body).toBeInstanceOf(FormData);
  expect(new Headers(upload.headers).has('content-type')).toBe(false);
  await expect(
    client.uploadProfileImage(
      new File(['svg'], 'bad.svg', { type: 'image/svg+xml' }),
      token,
      signal,
    ),
  ).rejects.toThrow('10MB');
  expect(request).toHaveBeenCalledTimes(2);
});

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
