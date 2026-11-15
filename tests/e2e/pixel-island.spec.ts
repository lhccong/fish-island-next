import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(120_000);

async function bounds(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const selector of [
    '#main-content',
    '[aria-label="群聊输入区"]',
    '[aria-label="主题选项"]',
  ]) {
    const element = page.locator(selector);
    if (await element.isVisible()) {
      expect(await element.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    }
  }
}

async function screenshot(page: Page, info: TestInfo, name: string) {
  await bounds(page);
  await page.screenshot({ path: info.outputPath(`${name}.png`), scale: 'css' });
}

async function selectSkin(page: Page, name: string) {
  const mobile = page.viewportSize()!.width <= 760;
  const returnToChat =
    mobile && !(await page.getByRole('button', { name: '切换主题', exact: true }).isVisible());
  if (returnToChat) await page.getByRole('link', { name: '返回热榜', exact: true }).tap();
  await page.getByRole('button', { name: '切换主题', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '主题模式' });
  await dialog.getByRole('button', { name, exact: true }).click();
  await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(page.getByRole('button', { name: '切换主题', exact: true })).toBeFocused();
  if (returnToChat) {
    await page.getByRole('link', { name: '聊天', exact: true }).tap();
    await expect(page.getByRole('textbox', { name: '消息草稿', exact: true })).toBeVisible();
  }
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'] as const) {
    test(`${skin.id} ${mode}: states, picker, scroll and persistence`, async ({ page }, info) => {
      let state: 'loading' | 'empty' | 'error' | 'success' = 'loading';
      let requests = 0;
      let release: (() => void) | undefined;
      await page.addInitScript(
        ({ id, mode }) => {
          if (!localStorage.getItem('fish-island:skin'))
            localStorage.setItem('fish-island:skin', id);
          if (!localStorage.getItem('fish-island:color-mode'))
            localStorage.setItem('fish-island:color-mode', mode);
        },
        { id: skin.id, mode },
      );
      await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
      await page.route('**/api/hot/list', async (route) => {
        requests++;
        if (state === 'loading')
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        if (state === 'error') return route.fulfill({ status: 503, body: 'synthetic unavailable' });
        return route.fulfill({
          json: {
            code: 0,
            data:
              state === 'empty'
                ? []
                : [
                    {
                      id: 'pixel-test',
                      name: '合成海岛热榜',
                      categoryName: '综合',
                      data: [{ title: '合成像素主题验证条目', url: 'https://example.com/pixel' }],
                    },
                  ],
          },
        });
      });
      await page.goto('/');
      await expect(
        page.getByRole('status').filter({ hasText: '正在获取各平台热榜' }),
      ).toBeVisible();
      await screenshot(page, info, 'loading');
      state = 'empty';
      release!();
      await expect(page.getByText('暂时没有热榜内容', { exact: true })).toBeVisible();
      await screenshot(page, info, 'empty');
      state = 'error';
      await page.reload();
      await expect(page.getByRole('alert')).toBeVisible();
      await screenshot(page, info, 'error');
      state = 'success';
      await page.getByRole('button', { name: '重试', exact: true }).click();
      await expect(page.getByRole('link', { name: /合成像素主题验证条目/ })).toBeVisible();
      await screenshot(page, info, 'success');
      const before = requests;
      await page.getByRole('button', { name: '切换主题', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: '主题模式' });
      await expect(dialog.getByRole('button', { name: skin.name, exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      const opposite = mode === 'light' ? '暗夜模式' : '明亮模式';
      await dialog.getByRole('button', { name: opposite, exact: true }).click();
      await dialog
        .getByRole('button', { name: mode === 'light' ? '明亮模式' : '暗夜模式', exact: true })
        .click();
      await screenshot(page, info, 'picker');
      const viewport = page.viewportSize()!;
      await page.setViewportSize({ ...viewport, height: 440 });
      const scroll = dialog.getByRole('region', { name: '主题选项' });
      await expect
        .poll(() => scroll.evaluate((el) => el.scrollHeight > el.clientHeight))
        .toBe(true);
      await scroll.focus();
      if (viewport.width <= 760) {
        const box = (await scroll.boundingBox())!;
        const session = await page.context().newCDPSession(page);
        const x = box.x + box.width / 2;
        const start = box.y + box.height - 12;
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y: start }],
        });
        for (let step = 1; step <= 8; step++) {
          await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: start - ((box.height - 24) * step) / 8 }],
          });
        }
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
        await session.detach();
      }
      await scroll.press('End');
      await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      const last = dialog.getByRole('button', { name: '钉钉蓝', exact: true });
      await last.focus();
      await expect(last).toBeInViewport();
      await bounds(page);
      const spacing = await last.evaluate((el) => {
        const root = el.closest('[data-gutter="reserved"]')!;
        return root.getBoundingClientRect().right - el.getBoundingClientRect().right;
      });
      expect(spacing).toBeGreaterThanOrEqual(viewport.width <= 760 ? 20 : 24);
      await scroll.hover();
      const rail = dialog.locator('[data-orientation="vertical"]');
      await expect(rail).toHaveCSS('visibility', viewport.width <= 760 ? 'hidden' : 'visible');
      if (viewport.width > 760) await expect(rail).toHaveCSS('opacity', '1');
      await screenshot(page, info, 'picker-scrolled');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: '切换主题', exact: true })).toBeFocused();
      await page.setViewportSize(viewport);
      expect(requests).toBe(before);
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
      await page.goto('/discover');
      await expect(page.getByRole('link', { name: '游戏', exact: true })).toBeVisible();
      await screenshot(page, info, 'discovery');
    });

    test(`${skin.id} ${mode}: chat preserves height, draft, messages and connection`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      fixture.push('179453001', '合成岛民：海风正好，慢慢聊。');
      const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
      await draft.fill('切换外观时保留的合成草稿');
      await expect(page.getByText('合成岛民：海风正好，慢慢聊。', { exact: true })).toBeVisible();
      await screenshot(page, info, 'chat');
      const before = fixture.stats();
      await selectSkin(page, '微信绿');
      const normalMain = await page.locator('#main-content').boundingBox();
      const normalComposer = await page
        .getByRole('region', { name: '群聊输入区', exact: true })
        .boundingBox();
      await selectSkin(page, '摸鱼岛像素风');
      expect(await page.locator('#main-content').boundingBox()).toMatchObject({
        y: normalMain!.y,
        height: normalMain!.height,
      });
      const islandComposer = await page
        .getByRole('region', { name: '群聊输入区', exact: true })
        .boundingBox();
      expect(islandComposer!.y).toBe(normalComposer!.y);
      expect(islandComposer!.height).toBe(normalComposer!.height);
      const scene = page.locator('[data-island-scene]');
      const sceneBox = await scene.boundingBox();
      const headerBox = await scene.locator('..').boundingBox();
      expect(sceneBox!.y).toBeGreaterThanOrEqual(headerBox!.y);
      expect(sceneBox!.y + sceneBox!.height).toBeLessThanOrEqual(headerBox!.y + headerBox!.height);
      await screenshot(page, info, 'chat-island');
      await selectSkin(page, skin.name);
      await expect(draft).toHaveText('切换外观时保留的合成草稿');
      await expect(page.getByText('合成岛民：海风正好，慢慢聊。', { exact: true })).toBeVisible();
      expect(fixture.stats().connections).toBe(before.connections);
      expect(fixture.stats().historyRequests).toBe(before.historyRequests);
      await bounds(page);
    });
  }
