import { expect, type Route } from '@playwright/test';

export function createTreasureFixture() {
  const state = {
    used: 0,
    offset: 0,
    nextAvailableAt: 0,
    fail: false,
    failStart: false,
    failFinish: false,
    loseStart: false,
    hold: false,
    release: () => {},
    starts: 0,
    finishes: 0,
    credits: 0,
    reads: 0,
    active: null as null | { id: string; siteId: string; readyAt: number },
    lastReward: null as null | { id: string; siteId: string; points: number },
  };
  function snapshot() {
    const now = Date.now() + state.offset;
    const day = Math.floor((now + 28800000) / 86400000);
    return {
      serverNow: now,
      resetAt: (day + 1) * 86400000 - 28800000,
      nextAvailableAt: state.nextAvailableAt,
      used: state.used,
      active: state.active,
      lastReward: state.lastReward,
    };
  }
  async function handle(route: Route, path: string) {
    const fail = (message: string) => route.fulfill({ json: { code: 40000, message } });
    if (path === 'pet/treasure/status') {
      state.reads++;
      if (state.hold)
        await new Promise<void>((resolve) => {
          state.release = resolve;
        });
      if (state.fail) return fail('挖宝状态读取失败，请重试');
    } else if (path === 'pet/treasure/start') {
      expect(route.request().method()).toBe('POST');
      state.starts++;
      if (state.failStart) return fail('开始挖宝失败，请重试');
      const body = route.request().postDataJSON() as { siteId: string };
      expect(Object.keys(body)).toEqual(['siteId']);
      if (!state.active) {
        if (state.used >= 5 || state.nextAvailableAt > snapshot().serverNow)
          return fail('尚未刷新或次数已用完');
        state.used++;
        state.lastReward = null;
        state.active = {
          id: `dig-${state.used}`,
          siteId: body.siteId,
          readyAt: snapshot().serverNow + 5000,
        };
      }
      if (state.loseStart) {
        state.loseStart = false;
        return route.abort('failed');
      }
    } else if (path === 'pet/treasure/finish') {
      expect(route.request().method()).toBe('POST');
      state.finishes++;
      if (state.failFinish) return fail('奖励结算失败，请重试');
      if (state.active) {
        expect(route.request().postDataJSON()).toEqual({ id: state.active.id });
        if (snapshot().serverNow < state.active.readyAt) return fail('还在挖掘中');
        state.lastReward = { id: state.active.id, siteId: state.active.siteId, points: 7 };
        state.nextAvailableAt = state.active.readyAt + 3600000;
        state.active = null;
        state.credits++;
      }
    } else throw new Error(`Unknown treasure fixture: ${path}`);
    const data = snapshot();
    // Match the actual backend JsonConfig: long timestamps are JSON strings; int stays numeric.
    return route.fulfill({
      json: {
        code: 0,
        data: {
          ...data,
          serverNow: String(data.serverNow),
          resetAt: String(data.resetAt),
          nextAvailableAt: String(data.nextAvailableAt),
          active: data.active ? { ...data.active, readyAt: String(data.active.readyAt) } : null,
        },
      },
    });
  }
  return { state, handle };
}
