import { expect, it } from 'vitest';
import { safeLoginRedirect } from './login-redirect';

it('only returns local destinations and avoids login loops', () => {
  expect(safeLoginRedirect('/chat?room=1#latest')).toBe('/chat?room=1#latest');
  for (const input of [
    null,
    'https://example.com',
    '//example.com',
    '/\\example.com',
    '/user/login',
    '/a/../user/login',
    '/hello world',
    '/login?redirect=/chat',
  ])
    expect(safeLoginRedirect(input)).toBe('/');
});
