import { expect, test, type Route } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(60000);
test('SVG motion changes the glow and respects reduced motion', async ({ page }) => {
  await page.goto('/assets/chat-titles/title-12.svg');
  const surface = page.locator('.surface');
  const initial = await surface.evaluate((el) => getComputedStyle(el).filter);
  await expect.poll(() => surface.evaluate((el) => getComputedStyle(el).filter)).not.toBe(initial);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(surface).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.type')).toHaveCSS('animation-name', 'none');
  expect(await surface.evaluate((el) => getComputedStyle(el).fill)).toContain('#bg-static');
});
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: title artwork, seconds, image recovery and responsive metadata`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('换肤保留草稿');
      let imageRoute: Route | undefined;
      await page.route('https://oss.cqbo.com/moyu/title/**', (route) => {
        imageRoute = route;
      });
      const push = (id: number, titleId: string, level?: number) =>
        fixture.broadcast({
          id: String(id),
          content: `称号验收消息 ${id}`,
          timestamp: 1794441605123 + id * 1000,
          sender: { id: '456', name: '合成岛友', titleId, level },
        });
      for (const [id, titleId, level, name] of [
        [1, '0', 3, '水群达人'],
        [2, '0', 5, '摆烂大师'],
        [3, '12', 1, '摸鱼铲屎官'],
        [4, '7', 1, '电玩少女'],
      ] as const) {
        push(id, titleId, level);
        const row = page.locator(`[data-message-id="${id}"]`);
        const image = row.getByRole('img', { name, exact: true });
        await expect(image).toBeVisible();
        const source = await image.locator('image').getAttribute('href');
        expect((await page.request.get(source!)).ok()).toBe(true);
        await expect(row.locator('time')).toHaveText(/^\d{2}:\d{2}:\d{2}$/);
        await expect(row.locator('time')).toHaveAttribute(
          'datetime',
          new Date(1794441605123 + id * 1000).toISOString(),
        );
        expect(await row.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      }
      push(5, '13');
      const remoteRow = page.locator('[data-message-id="5"]');
      const badge = remoteRow.locator('[data-title-source="image"]');
      await expect(badge).toBeVisible();
      await expect.poll(() => !!imageRoute).toBe(true);
      const loadingBox = await badge.boundingBox();
      await imageRoute!.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="382" height="100"><rect width="382" height="100" rx="50" fill="#666"/><text x="100" y="65" fill="white" font-size="55">查无此人</text></svg>',
      });
      await expect
        .poll(() => badge.locator('img').evaluate((el) => (el as HTMLImageElement).naturalWidth))
        .toBe(382);
      const loadedBox = (await badge.boundingBox())!;
      expect({ width: loadedBox.width, height: loadedBox.height }).toEqual({
        width: loadingBox!.width,
        height: loadingBox!.height,
      });
      push(6, '19');
      const failed = page.locator('[data-message-id="6"]');
      await expect(failed.getByRole('img', { name: '犯困嫌疑人' })).toBeVisible();
      await expect.poll(() => imageRoute!.request().url()).toContain('auxi.jpg');
      await imageRoute!.abort();
      await expect(failed.getByText('犯困嫌疑人', { exact: true })).toBeVisible();
      push(7, '999');
      await expect(page.locator('[data-message-id="7"]').getByText('称号未收录')).toBeVisible();
      await page.screenshot({ path: info.outputPath('titles.png') });
      const viewport = page.viewportSize()!;
      if (viewport.width <= 760) await page.setViewportSize({ width: 1280, height: 900 });
      await page.getByRole('button', { name: '切换主题', exact: true }).click();
      const picker = page.getByRole('dialog', { name: '主题模式' });
      await picker
        .getByRole('button', { name: mode === 'light' ? '暗夜模式' : '明亮模式', exact: true })
        .click();
      await picker
        .getByRole('button', {
          name: builtinSkins.find((item) => item.id !== skin.id)!.name,
          exact: true,
        })
        .click();
      await picker.getByRole('button', { name: '关闭主题弹窗' }).click();
      if (viewport.width <= 760) await page.setViewportSize(viewport);
      await expect(draft).toHaveText('换肤保留草稿');
      expect(fixture.stats().connections).toBe(1);
      expect(fixture.stats().historyRequests).toBe(1);
      expect(
        await page
          .locator('[data-message-id], [data-title-source]')
          .evaluateAll((els) => els.every((el) => el.scrollWidth <= el.clientWidth + 1)),
      ).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (viewport.width <= 760) {
        const actions = page
          .locator('[data-message-id="7"]')
          .getByRole('button', { name: /消息操作/ });
        await actions.tap();
        await expect(page.getByRole('menu')).toBeVisible();
        await page.keyboard.press('Escape');
      }
    });
  }
