import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSsoClient } from './index';

afterEach(() => vi.unstubAllGlobals());
const request = {
  clientId: 'demo',
  redirectUri: 'https://client.example/callback',
  responseType: 'code',
  scope: 'read',
  state: '',
};
describe('legacy SSO adapter', () => {
  it.each([
    'https://client.example/callback?code=test',
    { code: 0, data: 'https://client.example/callback?code=test' },
  ])('accepts legacy URL response %j', async (payload) => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload)));
    vi.stubGlobal('fetch', fetcher);
    const client = createSsoClient('https://api.example/', () => ({
      name: 'synthetic-session',
      value: 'test',
    }));
    expect(await client.authorize(request, new AbortController().signal)).toBe(
      'https://client.example/callback?code=test',
    );
    const [url, options] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toBe('/api/oauth2/authorize');
    expect(new URL(url).searchParams.has('state')).toBe(false);
    expect(new Headers(options.headers).get('synthetic-session')).toBe('test');
    expect(options.credentials).toBe('include');
  });
  it.each(['javascript:alert(1)', '//client.example/callback', null])(
    'rejects invalid redirect %j',
    async (data) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 0, data }))),
      );
      await expect(
        createSsoClient('', () => null).authorize(request, new AbortController().signal),
      ).rejects.toThrow('未获取到重定向地址');
    },
  );
});
