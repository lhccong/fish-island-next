import { expect, test, type Locator, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(60_000);

async function scrollCollection(page: Page, list: Locator, mobile: boolean) {
  if (!mobile) {
    await list.focus();
    await page.keyboard.press('End');
    return;
  }
  const touch = await page.context().newCDPSession(page);
  try {
    const { x, y, width, height } = (await list.boundingBox())!;
    const middle = x + width / 2;
    for (let swipe = 0; swipe < 10; swipe++) {
      const atEnd = await list.evaluate(
        (element) => element.scrollHeight - element.clientHeight - element.scrollTop < 2,
      );
      if (atEnd) break;
      const start = y + height * 0.9;
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: middle, y: start }],
      });
      for (let step = 1; step <= 8; step++) {
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: middle, y: start - (height * 0.75 * step) / 8 }],
        });
        await page.evaluate(() => new Promise(requestAnimationFrame));
      }
      await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    }
  } finally {
    await touch.detach();
  }
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    test(`${skin.id} ${mode}: reads the selected user's card collection`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const mobile = page.viewportSize()!.width <= 760;
      let cover = 'https://menu.test/image.png';
      await page.route('**/api/user/get/vo?*', (route) =>
        route.fulfill({
          json: {
            code: 0,
            data: { id: '456', userName: '合成岛友', userAvatar: cover, momentsBgUrl: cover },
          },
        }),
      );
      await page.route('**/api/follow/is-following?*', (route) =>
        route.fulfill({ json: { code: 0, data: false } }),
      );
      const atlas = 'a'.repeat(64) + '.jpg';
      await page.route('**/api/pet/cards/art/**', (route) =>
        route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="2000"><rect width="1000" height="2000" fill="#268c83"/></svg>',
        }),
      );
      const initial = Promise.withResolvers<void>();
      let phase: 'initial' | 'ready' | 'empty' = 'initial';
      let continuationRequests = 0;
      let requests = 0;
      await page.route('**/api/pet/cards/collection?*', async (route) => {
        const query = new URL(route.request().url()).searchParams;
        expect(query.get('userId')).toBe('456');
        expect(route.request().headers()['synthetic-session']).toBe('synthetic-value');
        const current = query.get('page')!;
        requests++;
        if (phase === 'initial') {
          await initial.promise;
          return route.fulfill({ json: { code: 500, message: '合成初始查询失败' } });
        }
        if (current === '2' && ++continuationRequests === 1)
          return route.fulfill({ json: { code: 500, message: '合成续载失败' } });
        const ids = current === '2' ? [20, 21] : Array.from({ length: 20 }, (_, i) => i + 1);
        return route.fulfill({
          json: {
            code: 0,
            data: {
              items:
                phase === 'empty'
                  ? []
                  : ids.map((id) => ({
                      id: `card-${id}`,
                      name: `合成卡片 ${id}`,
                      grade: 'epic',
                      stars: 3,
                      artKey: atlas,
                      artTile: 0,
                      portrait: false,
                    })),
              total: phase === 'empty' ? '0' : '21',
            },
          },
        });
      });
      fixture.push('9001', '合成卡片收藏消息');
      const sender = page
        .locator('[data-message-id="9001"]')
        .getByRole('button', { name: '查看合成岛友的用户卡片' });
      if (mobile) await sender.tap();
      else await sender.click();
      const dialog = page.getByRole('dialog', { name: '用户卡片', exact: true });
      const trigger = dialog.getByRole('button', { name: '卡片收藏', exact: true });
      await expect(trigger).toBeVisible();
      expect(requests).toBe(0);
      for (const name of ['宠物', '农场', '卡片收藏'])
        await expect(dialog.getByRole('button', { name, exact: true })).toBeVisible();
      if (mobile) {
        expect((await trigger.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        await trigger.tap();
      } else {
        await trigger.focus();
        await page.keyboard.press('Enter');
      }
      const retry = dialog.getByRole('button', { name: '重试卡片收藏' });
      await expect(dialog.getByRole('heading', { name: '合成岛友的卡片收藏' })).toBeVisible();
      await expect(dialog.getByText('正在读取卡片收藏…', { exact: true })).toBeVisible();
      initial.resolve();
      await expect(dialog.getByRole('alert')).toHaveText('合成初始查询失败');
      phase = 'ready';
      if (mobile) await retry.tap();
      else await retry.click();
      const list = dialog.getByRole('region', { name: '卡片收藏列表' });
      await expect(list.getByRole('listitem')).toHaveCount(20);
      await expect(list.getByText('史诗 · 3 星').first()).toBeVisible();
      await expect(list.locator('img[data-loaded="true"]').first()).toBeVisible();
      const layout = await list.evaluate((viewport) => {
        const first = viewport.querySelector('li')!.getBoundingClientRect();
        const second = viewport.querySelectorAll('li')[1]!.getBoundingClientRect();
        const frame = viewport.getBoundingClientRect();
        const scrollbar = viewport.parentElement!.querySelector<HTMLElement>(
          '[data-orientation="vertical"]',
        )!;
        return {
          start: first.left - frame.left,
          top: first.top - frame.top,
          end: frame.right - Math.max(first.right, second.right),
          columns: first.top === second.top ? 2 : 1,
          scrollbarVisible:
            getComputedStyle(scrollbar).visibility === 'visible' &&
            Number(getComputedStyle(scrollbar).opacity) === 1,
          fits:
            viewport.scrollWidth <= viewport.clientWidth &&
            document.documentElement.scrollWidth <= innerWidth,
        };
      });
      expect(layout).toMatchObject({
        columns: mobile ? 1 : 2,
        scrollbarVisible: !mobile,
        fits: true,
      });
      expect(layout.start).toBeGreaterThanOrEqual(4);
      expect(layout.top).toBeGreaterThanOrEqual(4);
      expect(layout.end).toBeGreaterThanOrEqual(mobile ? 20 : 24);
      if (skin.id === 'moyu-island')
        await dialog.screenshot({ path: info.outputPath('collection.png') });
      await scrollCollection(page, list, mobile);
      await expect(list.getByRole('alert')).toContainText('合成续载失败');
      await expect(list.getByRole('listitem')).toHaveCount(20);
      expect(await list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      if (mobile) {
        await scrollCollection(page, list, true);
        await expect(retry).toBeInViewport({ ratio: 1 });
        await retry.tap();
      } else await retry.click();
      await expect(list.getByRole('listitem')).toHaveCount(21);
      await scrollCollection(page, list, mobile);
      await expect(list.getByText('已全部加载')).toBeInViewport();
      await expect(list.getByText('合成卡片 21', { exact: true })).toBeInViewport();
      expect(continuationRequests).toBe(2);
      const back = dialog.getByRole('button', { name: '返回用户卡片' });
      if (mobile) await back.tap();
      else await back.click();
      await expect(trigger).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(sender).toBeFocused();
      cover = '';
      phase = 'empty';
      await sender.click();
      await expect(trigger).toHaveText('卡片收藏');
      await trigger.click();
      await expect(dialog.getByText('还没有收藏卡片')).toBeVisible();
      await dialog.getByRole('button', { name: '关闭用户卡片' }).click();
      await expect(sender).toBeFocused();
      expect(fixture.stats().connections).toBe(1);
    });
