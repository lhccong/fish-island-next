import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(60000);
test('floating chat keeps only the active main content landmark', async ({ page }) => {
  await setupChatMenu(page, 'pixel-island', 'light');
  if (page.viewportSize()!.width <= 760)
    await page.getByRole('button', { name: '更多聊天工具' }).click();
  await page.getByRole('button', { name: '小窗模式', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('#main-content')).toHaveCount(1);
  await expect(page.locator('#main-content')).toBeVisible();
  await page.getByRole('button', { name: '关闭聊天窗口', exact: true }).click();
  await expect(page).toHaveURL('/chat');
  await expect(page.locator('#main-content')).toHaveCount(1);
  await expect(page.locator('#main-content')).toBeVisible();
});

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: floating chat preserves editor, messages and connection`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const mobile = page.viewportSize()!.width <= 760;
      const editor = page.getByRole('textbox', { name: '消息草稿', exact: true });
      await editor.fill('切换小窗时保留的草稿');
      const originalEditor = await editor.elementHandle();
      if (mobile) await page.getByRole('button', { name: '更多聊天工具' }).tap();
      const enter = page.getByRole('button', { name: '小窗模式', exact: true });
      await enter.click();
      await expect(page).toHaveURL('/');
      // Group name is configurable; locate by its unique window close action instead.
      const close = page.getByRole('button', { name: '关闭聊天窗口', exact: true });
      await expect(close).toBeVisible();
      const surface = page.getByRole('dialog').filter({ has: close });
      await expect(editor).toHaveText('切换小窗时保留的草稿');
      expect(await editor.evaluate((el, original) => el === original, originalEditor)).toBe(true);
      const assertLayout = async () => {
        for (const element of [
          surface,
          page.getByRole('region', { name: '群聊输入区', exact: true }),
        ]) {
          expect(await element.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        }
        const box = (await surface.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
        await expect(close).toBeInViewport();
        await expect(editor).toBeInViewport();
      };
      await assertLayout();
      if (!mobile) {
        const before = (await surface.boundingBox())!;
        const title = surface.getByRole('button', { name: /拖动.*窗口/ });
        const box = (await title.boundingBox())!;
        await page.mouse.move(box.x + 20, box.y + 20);
        await page.mouse.down();
        await page.mouse.move(box.x - 100, box.y - 20);
        await page.mouse.up();
        expect((await surface.boundingBox())!.x).toBeLessThan(before.x);
        await surface.getByRole('button', { name: '调整聊天窗口大小' }).focus();
        await page.keyboard.press('ArrowRight');
        expect((await surface.boundingBox())!.width).toBe(before.width + 20);
        await surface.getByRole('button', { name: '最大化聊天窗口' }).click();
        await expect(surface).toHaveAttribute('data-maximized', 'true');
        await surface.getByRole('button', { name: '还原聊天窗口' }).click();
      }
      fixture.push('1794530000001', '小窗接收的合成消息');
      await expect(surface.getByText('小窗接收的合成消息', { exact: true })).toBeVisible();
      if (!mobile) {
        await page.getByRole('link', { name: '鱼小圈', exact: true }).click();
        await expect(page).toHaveURL('/moments/fish-circle');
        await expect(close).toBeVisible();
      }
      await surface.getByRole('button', { name: '收起聊天窗口' }).click();
      await expect(close).toBeHidden();
      await page.getByRole('link', { name: mobile ? '发现' : '热榜', exact: true }).click();
      await expect(page).toHaveURL(mobile ? '/discover' : '/');
      await page.getByRole('button', { name: '恢复聊天小窗' }).click();
      await expect(editor).toHaveText('切换小窗时保留的草稿');
      await page.route('**/api/chat/message/send', (route) => route.fulfill({ status: 503 }));
      await surface.getByRole('button', { name: '发送', exact: true }).click();
      await expect(surface.getByRole('button', { name: '重试发送', exact: true })).toBeVisible();
      await editor.fill('失败期间保留下一条草稿');
      await surface.getByRole('button', { name: '重试发送', exact: true }).click();
      await expect(surface.getByRole('button', { name: '重试发送', exact: true })).toBeVisible();
      await assertLayout();
      await page.screenshot({ path: info.outputPath('floating.png') });
      await close.click();
      await expect(close).toHaveCount(0);
      await expect(page).toHaveURL('/chat');
      await expect(editor).toHaveText('失败期间保留下一条草稿');
      expect(await editor.evaluate((el, original) => el === original, originalEditor)).toBe(true);
      await expect(enter).toBeFocused();
      await enter.click();
      if (!(await surface.getByRole('button', { name: '返回完整聊天', exact: true }).isVisible()))
        await surface.getByRole('button', { name: '更多聊天工具' }).click();
      const back = surface.getByRole('button', { name: '返回完整聊天', exact: true });
      await expect(back).toBeVisible();
      await back.click();
      await expect(page).toHaveURL('/chat');
      await expect(close).toHaveCount(0);
      expect(fixture.stats().connections).toBe(1);
      expect(fixture.stats().historyRequests).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await originalEditor?.dispose();
    });
  }
