import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(60000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: floating loading, retry, scrolling and appearance`, async ({
      page,
    }, info) => {
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      let attempts = 0;
      const setup = setupChatMenu(page, skin.id, mode, 'user', async () => {
        await page.route('**/api/chat/message/page/vo', async (route) => {
          attempts++;
          if (attempts === 1) {
            await pending;
            await route.fulfill({ status: 503 });
          } else await route.fulfill({ json: { code: 0, data: { records: [] } } });
        });
      });
      const loading = page.getByText('正在加载历史消息…', { exact: true });
      await expect(loading).toBeVisible();
      if (page.viewportSize()!.width <= 760)
        await page.getByRole('button', { name: '更多聊天工具' }).tap();
      await page.getByRole('button', { name: '小窗模式', exact: true }).click();
      const surface = page
        .getByRole('dialog')
        .filter({ has: page.getByRole('button', { name: '关闭聊天窗口' }) });
      await expect(surface.getByText('正在加载历史消息…', { exact: true })).toBeVisible();
      await expect(
        surface.getByRole('status').filter({ hasText: '正在加载历史消息…' }).locator('svg'),
      ).toBeVisible();
      release();
      await surface.getByRole('button', { name: '重试历史消息', exact: true }).click();
      const fixture = await setup;
      await expect(surface.getByText('暂无消息，连接后将在这里接收新消息')).toBeVisible();
      const editor = page.getByRole('textbox', { name: '消息草稿', exact: true });
      await editor.fill('主题和菜单切换保留草稿');
      const originalEditor = await editor.elementHandle();
      await surface.getByRole('button', { name: '收起聊天窗口' }).click();
      await expect(page.getByRole('button', { name: '恢复聊天小窗' })).toBeFocused();
      await page.getByRole('link', { name: '聊天', exact: true }).click();
      await page.getByRole('button', { name: '切换主题', exact: true }).click();
      const picker = page.getByRole('dialog', { name: '主题模式', exact: true });
      const other = builtinSkins.find((candidate) => candidate.id !== skin.id)!;
      await picker.getByRole('button', { name: other.name, exact: true }).click();
      await picker
        .getByRole('button', { name: mode === 'light' ? '暗夜模式' : '明亮模式', exact: true })
        .click();
      await picker.getByRole('button', { name: skin.name, exact: true }).click();
      await picker
        .getByRole('button', { name: mode === 'light' ? '明亮模式' : '暗夜模式', exact: true })
        .click();
      await picker.getByRole('button', { name: '关闭主题弹窗', exact: true }).click();
      await page.getByRole('button', { name: '恢复聊天小窗' }).click();
      await expect(editor).toHaveText('主题和菜单切换保留草稿');
      expect(await editor.evaluate((el, original) => el === original, originalEditor)).toBe(true);
      for (let index = 1; index <= 45; index++)
        fixture.push(String(1794531000000 + index), `合成滚动消息 ${index}`);
      const scroll = surface.getByRole('region', { name: '群聊消息区', exact: true });
      await expect(surface.getByText('合成滚动消息 45', { exact: true })).toBeInViewport();
      if (page.viewportSize()!.width <= 760) {
        const box = (await scroll.boundingBox())!;
        const session = await page.context().newCDPSession(page);
        await session.send('Input.synthesizeScrollGesture', {
          x: box.x + box.width / 2,
          y: box.y + box.height / 2,
          yDistance: 1800,
          gestureSourceType: 'touch',
        });
        await session.detach();
      } else {
        await scroll.hover();
        await page.mouse.wheel(0, -3000);
      }
      await scroll.evaluate((el) => {
        el.scrollTop = 0;
      });
      await expect(surface.getByText('合成滚动消息 1', { exact: true })).toBeInViewport();
      expect(await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await scroll.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await expect(surface.getByText('合成滚动消息 45', { exact: true })).toBeInViewport();
      await page.screenshot({ path: info.outputPath('appearance-scroll.png') });
      expect(fixture.stats().connections).toBe(1);
      expect(attempts).toBe(2);
      await surface.getByRole('button', { name: '关闭聊天窗口' }).click();
      await originalEditor?.dispose();
    });
  }
