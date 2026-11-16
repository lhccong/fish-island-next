import { expect as baseExpect, test, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(60_000);
test.use({ actionTimeout: 15_000 });
const expect = baseExpect.configure({ timeout: 15_000 });

async function bounds(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const selector of ['#main-content', '[aria-label="群聊输入区"]']) {
    const node = page.locator(selector);
    if (await node.isVisible())
      expect(await node.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  }
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'] as const) {
    test(`${skin.id} ${mode}: hot states and classic compatibility`, async ({ page }, info) => {
      let state: 'loading' | 'empty' | 'error' | 'success' = 'loading';
      let release: (() => void) | undefined;
      await page.addInitScript(
        ({ id, mode }) => {
          localStorage.setItem('fish-island:skin', id);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { id: skin.id, mode },
      );
      await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
      await page.route('**/api/hot/list', async (route) => {
        if (state === 'loading')
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        if (state === 'error') return route.fulfill({ status: 503 });
        return route.fulfill({
          json: {
            code: 0,
            data:
              state === 'empty'
                ? []
                : Array.from({ length: 6 }, (_, i) => ({
                    id: `source-${i}`,
                    name: `合成热榜${i}`,
                    categoryName: '综合',
                    data: Array.from({ length: 30 }, (_, j) => ({
                      title: `合成热点 ${i}-${j}`,
                      url: `https://example.com/${i}/${j}`,
                      hot: '10万',
                    })),
                  })),
          },
        });
      });
      await page.goto('/');
      await expect(
        page.getByRole('status').filter({ hasText: '正在获取各平台热榜' }),
      ).toBeVisible();
      await bounds(page);
      state = 'empty';
      release!();
      await expect(page.getByText('暂时没有热榜内容', { exact: true })).toBeVisible();
      await bounds(page);
      state = 'error';
      await page.reload();
      await expect(page.getByRole('alert')).toBeVisible();
      await bounds(page);
      state = 'success';
      await page.getByRole('button', { name: '重试', exact: true }).click();
      await expect(page.getByRole('link', { name: /合成热点 0-0/ })).toBeVisible();
      await bounds(page);
      if (skin.id === 'moyu-island') {
        await page.screenshot({ path: info.outputPath(`hot-${mode}.png`) });
        const scroll = page.getByRole('region', { name: '合成热榜0榜单滚动区', exact: true });
        if (await scroll.isVisible()) {
          await scroll.hover();
          if (page.viewportSize()!.width <= 760) {
            const box = (await scroll.boundingBox())!;
            const session = await page.context().newCDPSession(page);
            const x = box.x + box.width / 2;
            const y = Math.min(box.y + box.height, page.viewportSize()!.height - 100) - 30;
            await session.send('Input.dispatchTouchEvent', {
              type: 'touchStart',
              touchPoints: [{ x, y }],
            });
            for (let i = 1; i <= 8; i++)
              await session.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ x, y: y - i * 25 }],
              });
            await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await session.detach();
          } else await page.mouse.wheel(0, 500);
          await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
        }
        await page.getByRole('button', { name: '查看合成热榜0消息', exact: true }).click();
        await bounds(page);
      }
    });

    test(`${skin.id} ${mode}: chat draft and connection survive theme changes`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      fixture.push('179453001', '合成验证消息');
      const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
      await draft.fill('保留草稿');
      await expect(page.getByText('合成验证消息', { exact: true })).toBeVisible();
      await bounds(page);
      if (skin.id === 'moyu-island')
        await page.screenshot({ path: info.outputPath(`chat-${mode}.png`) });
      const before = fixture.stats();
      const picker = page
        .getByRole('button', { name: '切换主题', exact: true })
        .filter({ visible: true });
      await picker.click();
      const dialog = page.getByRole('dialog', { name: '主题模式' });
      await dialog.getByRole('button', { name: '摸鱼岛', exact: true }).click();
      await dialog.getByRole('button', { name: '关闭', exact: true }).click();
      await expect(draft).toHaveText('保留草稿');
      expect(fixture.stats().connections).toBe(before.connections);
      expect(fixture.stats().historyRequests).toBe(before.historyRequests);
      await bounds(page);
      if (page.viewportSize()!.width <= 760) {
        await page.getByRole('button', { name: '更多聊天工具', exact: true }).tap();
        await expect(
          page.getByRole(skin.id === 'moyu-island' ? 'menuitem' : 'button', {
            name: '小窗模式',
            exact: true,
          }),
        ).toBeVisible();
        await page.keyboard.press('Escape');
      } else {
        await page.getByRole('button', { name: '隐藏在线成员', exact: true }).click();
        await page.getByRole('button', { name: '展开在线成员', exact: true }).click();
      }
    });
  }
