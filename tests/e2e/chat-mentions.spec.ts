import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: inline mention selection and member states`, async ({
      page,
    }, info) => {
      await setupChatMenu(page, skin.id, mode);
      let phase = 'loading';
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      let requests = 0;
      await page.route('**/api/chat/online/user', async (route) => {
        requests++;
        if (phase === 'loading') await pending;
        await route.fulfill({
          status: phase === 'error' ? 503 : 200,
          json: {
            code: 0,
            data:
              phase === 'empty'
                ? []
                : Array.from({ length: 40 }, (_, i) => ({
                    id: String(500 + i),
                    name: `合成岛友${String(i).padStart(2, '0')}`,
                    avatar: null,
                  })),
          },
        });
      });
      const editor = page.getByRole('textbox', { name: '消息草稿' });
      const panel = page.getByRole('region', { name: '提及在线成员', exact: true });
      await editor.fill('@');
      await expect(panel).toContainText('暂无在线成员');
      await editor.press('Escape');
      await expect(panel).toBeHidden();
      const refreshMembers = async () => {
        await page.getByRole('button', { name: '群聊详情', exact: true }).click();
        const members = page.getByRole('complementary', { name: '在线成员', exact: true });
        await members.getByRole('button', { name: '刷新', exact: true }).click();
        await members.getByRole('button', { name: '关闭在线列表' }).click();
        await editor.fill('');
        await editor.pressSequentially('@');
      };
      await refreshMembers();
      await expect(panel).toContainText('正在获取在线成员');
      phase = 'error';
      release();
      await expect(panel).toContainText('在线成员加载失败');
      phase = 'success';
      await panel.getByRole('button', { name: '重试', exact: true }).click();
      await expect(panel.getByRole('option')).toHaveCount(40);
      await editor.focus();
      await editor.press('ArrowDown');
      await editor.press('Enter');
      await expect(editor).toHaveText('@合成岛友01 ');
      await expect(editor).toBeFocused();
      await expect(panel).toBeHidden();
      await editor.fill('前文 @岛 后文');
      await editor.press('Home');
      for (let i = 0; i < 5; i++) await editor.press('ArrowRight');
      await expect(panel.getByRole('option')).toHaveCount(40);
      const scroll = panel.getByRole('region', { name: '提及在线成员滚动区' });
      await scroll.hover();
      await expect
        .poll(() => scroll.evaluate((el) => el.scrollHeight > el.clientHeight))
        .toBe(true);
      const scrollBounds = (await scroll.boundingBox())!;
      if (page.viewportSize()!.width <= 760) {
        const session = await page.context().newCDPSession(page);
        const x = scrollBounds.x + scrollBounds.width / 2;
        const y = scrollBounds.y + scrollBounds.height - 12;
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        });
        for (let step = 1; step <= 5; step++)
          await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y - step * 25 }],
          });
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await session.detach();
      } else await page.mouse.wheel(0, 180);
      await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      // A tap during a native touch fling stops momentum instead of activating an option.
      let previousTop = -1;
      let stableSamples = 0;
      await expect
        .poll(
          async () => {
            const top = await scroll.evaluate((el) => el.scrollTop);
            stableSamples = top === previousTop ? stableSamples + 1 : 0;
            previousTop = top;
            return stableSamples;
          },
          { intervals: [100], timeout: 10000 },
        )
        .toBeGreaterThanOrEqual(3);
      await scroll.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      const last = panel.getByRole('option').last();
      await expect(last).toBeVisible();
      const bounds = (await panel.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      const mobile = page.viewportSize()!.width <= 760;
      const track = scroll.locator('..').locator(':scope > [data-orientation="vertical"]');
      await expect(track).toHaveCSS('visibility', mobile ? 'hidden' : 'visible');
      expect(await last.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(
        44,
      );
      expect(
        await scroll.evaluate((el) => {
          const option = el.querySelector('[role="option"]')!;
          return el.getBoundingClientRect().right - option.getBoundingClientRect().right;
        }),
      ).toBeGreaterThanOrEqual(mobile ? 20 : 24);
      await page.screenshot({ path: info.outputPath('mention-candidates.png') });
      if (page.viewportSize()!.width <= 760) await last.tap();
      else await last.click();
      await expect(editor).toHaveText('前文 @合成岛友39  后文');
      await expect(editor).toBeFocused();
      await editor.fill('@无匹配');
      await expect(panel).toContainText('没有匹配的在线成员');
      await editor.dispatchEvent('compositionstart');
      await expect(panel).toBeHidden();
      await editor.dispatchEvent('compositionend');
      await expect(panel).toBeVisible();
      await editor.press('Escape');
      await expect(panel).toBeHidden();
      await editor.fill('a@fish.com');
      await expect(panel).toBeHidden();
      expect(requests).toBe(2);
      phase = 'empty';
      await refreshMembers();
      await expect(panel).toContainText('暂无在线成员');
      await editor.press('Tab');
      await expect(panel).toBeHidden();
    });
  }
