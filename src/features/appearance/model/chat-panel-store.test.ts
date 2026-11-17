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
  store.getState().setCirclePosition('right');
  expect(store.getState()).toMatchObject({
    circleCollapsed: true,
    membersCollapsed: true,
    circlePosition: 'right',
  });
});

test.each([undefined, null, 'top', true, 1])(
  'old or invalid circle positions default to left: %s',
  async (circlePosition) => {
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ circleCollapsed: true, circlePosition }),
    });
    const { useChatPanelStore: store } = await import('./chat-panel-store');
    expect(store.getState()).toMatchObject({ circleCollapsed: true, circlePosition: 'left' });
  },
);

test('circle position survives reload and independent collapse changes', async () => {
  let saved = '{"circleCollapsed":true,"membersCollapsed":false}';
  vi.stubGlobal('localStorage', {
    getItem: () => saved,
    setItem: (_key: string, value: string) => (saved = value),
  });
  let { useChatPanelStore: store } = await import('./chat-panel-store');
  store.getState().setCirclePosition('right');
  store.getState().setCircleCollapsed(false);
  store.getState().setMembersCollapsed(true);
  vi.resetModules();
  ({ useChatPanelStore: store } = await import('./chat-panel-store'));
  expect(store.getState()).toMatchObject({
    circleCollapsed: false,
    membersCollapsed: true,
    circlePosition: 'right',
  });
  store.getState().setCirclePosition('left');
  vi.resetModules();
  ({ useChatPanelStore: store } = await import('./chat-panel-store'));
  expect(store.getState().circlePosition).toBe('left');
});
