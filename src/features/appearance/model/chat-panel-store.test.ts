import { afterEach, beforeEach, expect, test, vi } from 'vitest';

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

test.each(['null', '{broken', '[]', '{"circleCollapsed":"true","membersCollapsed":1}'])(
  'invalid preferences fall back to expanded: %s',
  async (saved) => {
    vi.stubGlobal('localStorage', { getItem: () => saved });
    const { useChatPanelStore: store } = await import('./chat-panel-store');
    expect(store.getState()).toMatchObject({ circleCollapsed: false, membersCollapsed: false });
  },
);

test('independent panel choices survive a fresh store and preserve valid partial values', async () => {
  const entries = new Map<string, string>([
    ['fish-island:chat-panels:v1', '{"circleCollapsed":true,"membersCollapsed":"bad"}'],
  ]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
  });
  let { useChatPanelStore: store } = await import('./chat-panel-store');
  expect(store.getState()).toMatchObject({ circleCollapsed: true, membersCollapsed: false });
  store.getState().setMembersCollapsed(true);
  vi.resetModules();
  ({ useChatPanelStore: store } = await import('./chat-panel-store'));
  expect(store.getState()).toMatchObject({ circleCollapsed: true, membersCollapsed: true });
  store.getState().setCircleCollapsed(false);
  vi.resetModules();
  ({ useChatPanelStore: store } = await import('./chat-panel-store'));
  expect(store.getState()).toMatchObject({ circleCollapsed: false, membersCollapsed: true });
  store.getState().setMembersCollapsed(false);
  vi.resetModules();
  ({ useChatPanelStore: store } = await import('./chat-panel-store'));
  expect(store.getState()).toMatchObject({ circleCollapsed: false, membersCollapsed: false });
  expect([...entries.keys()]).toEqual(['fish-island:chat-panels:v1']);
});

test('unavailable storage retains current session choices', async () => {
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('denied');
    },
  });
  const { useChatPanelStore: store } = await import('./chat-panel-store');
  store.getState().setCircleCollapsed(true);
  store.getState().setMembersCollapsed(true);
  expect(store.getState()).toMatchObject({ circleCollapsed: true, membersCollapsed: true });
});
