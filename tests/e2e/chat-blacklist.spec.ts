import { expect, test, type Route } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { openMessageActions } from './chat-message-actions';
import { open } from './account-menu-layout';

test.setTimeout(60000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: blocked history and live messages leave no rows or placeholders`, async ({
      page,
    }, info) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(() => {
        localStorage.setItem(
          'fish-island:blacklist:123',
          JSON.stringify([{ id: '456', name: '合成岛友' }]),
        );
      });
      let held!: Route;
      let attempts = 0;
      const fixture = await setupChatMenu(
        page,
        skin.id,
        mode,
        'user',
        async () => {
          await page.route('**/api/chat/message/page/vo', async (route) => {
            attempts++;
            if (attempts === 1) {
              held = route;
              return;
            }
            await route.fulfill({
              json: {
                code: 0,
                data: {
                  records: [
                    {
                      messageWrapper: {
                        message: {
                          id: '1',
                          content: '不应显示的历史消息',
                          sender: { id: '456', name: '合成岛友' },
                          timestamp: 1794441600001,
                        },
                      },
                    },
                  ],
                },
              },
            });
          });
        },
        false,
      );
      const mobile = page.viewportSize()!.width <= 760;
      const activate = async (locator: ReturnType<typeof page.getByRole>) => {
        if (mobile) await locator.tap();
        else await locator.click();
      };
      await expect(page.getByText('正在加载历史消息…', { exact: true })).toBeVisible();
      await expect.poll(() => attempts).toBe(1);
      await held.fulfill({ status: 503 });
      await activate(page.getByRole('button', { name: '重试历史消息', exact: true }));
      await expect(page.getByText('暂无消息，连接后将在这里接收新消息')).toBeVisible();
      await expect(page.locator('[data-message-id], [data-item-index]')).toHaveCount(0);
      await expect(page.getByText('已屏蔽该岛友的消息')).toHaveCount(0);
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('屏蔽操作保留草稿');
      fixture.push('2', '@本人合成 不应显示的实时消息');
      fixture.push('3', '可见的消息', true);
      await expect(page.locator('[data-message-id="3"]')).toBeVisible();
      await expect(page.locator('[data-message-id], [data-item-index]')).toHaveCount(2);
      await expect(page.getByRole('button', { name: /条消息 @我/ })).toHaveCount(0);

      fixture.broadcast({
        id: '4',
        content: '可以屏蔽的另一位岛友',
        sender: { id: '789', name: '合成另一位岛友' },
        timestamp: 1794441600004,
      });
      const menu = await openMessageActions(page, '4');
      await activate(menu.getByRole('menuitem', { name: '加入黑名单', exact: true }));
      await expect(page.locator('[data-message-id="4"]')).toHaveCount(0);
      await expect(draft).toBeFocused();
      await expect(draft).toHaveText('屏蔽操作保留草稿');
      await expect(page.getByText('已屏蔽该岛友的消息')).toHaveCount(0);
      expect(attempts).toBe(2);
      expect(fixture.stats().connections).toBe(1);
      await page.screenshot({ path: info.outputPath('blacklist-hidden.png') });
      await activate(page.getByRole('button', { name: '切换主题', exact: true }));
      const picker = page.getByRole('dialog', { name: '主题模式' });
      const other = builtinSkins.find((item) => item.id !== skin.id)!;
      await activate(picker.getByRole('button', { name: other.name, exact: true }));
      await activate(
        picker.getByRole('button', {
          name: mode === 'light' ? '暗夜模式' : '明亮模式',
          exact: true,
        }),
      );
      await activate(picker.getByRole('button', { name: skin.name, exact: true }));
      await activate(
        picker.getByRole('button', {
          name: mode === 'light' ? '明亮模式' : '暗夜模式',
          exact: true,
        }),
      );
      await activate(picker.getByRole('button', { name: '关闭主题弹窗', exact: true }));
      await expect(page.locator('[data-message-id]')).toHaveCount(1);
      await expect(draft).toHaveText('屏蔽操作保留草稿');
      expect(attempts).toBe(2);
      expect(fixture.stats().connections).toBe(1);

      // A second tab removing an entry must restore cached messages without a request.
      await page.evaluate(() => {
        const key = 'fish-island:blacklist:123';
        const value = JSON.stringify([{ id: '789', name: '合成另一位岛友' }]);
        localStorage.setItem(key, value);
        window.dispatchEvent(new StorageEvent('storage', { key, newValue: value }));
      });
      await expect(page.locator('[data-message-id="1"]')).toBeVisible();
      await expect(page.locator('[data-message-id="2"]')).toBeVisible();
      await expect(page.locator('[data-message-id]')).toHaveCount(3);
      expect(attempts).toBe(2);

      const dialog = await open(page, '我的黑名单');
      await activate(dialog.getByRole('button', { name: '移除', exact: true }));
      await activate(dialog.getByRole('button', { name: '确认移除', exact: true }));
      await expect(dialog.getByText('暂无黑名单用户。可在聊天消息菜单中屏蔽岛友。')).toBeVisible();
      await page.keyboard.press('Escape');
      if (mobile) await page.getByRole('link', { name: /聊天/ }).first().tap();
      await expect(page.locator('[data-message-id="4"]')).toBeVisible();
      await expect(draft).toHaveText('屏蔽操作保留草稿');
      const scroll = page.getByRole('region', { name: '群聊消息区', exact: true });
      for (let id = 10; id <= 50; id++) fixture.push(String(id), `滚动验证消息 ${id}`, true);
      await expect(page.locator('[data-message-id="50"]')).toBeInViewport();
      const bottom = await scroll.evaluate((el) => el.scrollTop);
      expect(bottom).toBeGreaterThan(0);
      if (mobile) {
        const touch = await page.context().newCDPSession(page);
        const box = (await scroll.boundingBox())!;
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 3;
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        });
        for (let step = 1; step <= 8; step++)
          await touch.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y + (Math.min(220, box.height / 2) * step) / 8 }],
          });
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await touch.detach();
      } else {
        await scroll.hover();
        await page.mouse.wheel(0, -500);
      }
      await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeLessThan(bottom - 50);
      let previousTop = -1;
      let settled = 0;
      await expect
        .poll(async () => {
          const top = await scroll.evaluate((el) => el.scrollTop);
          settled = Math.abs(top - previousTop) < 1 ? settled + 1 : 0;
          previousTop = top;
          return settled;
        })
        .toBeGreaterThanOrEqual(3);
      const latest = page.getByRole('button', { name: '查看最新消息', exact: true });
      await expect(latest).toBeVisible();
      await page.evaluate(() => {
        const key = 'fish-island:blacklist:123';
        const value = JSON.stringify([{ id: '456', name: '合成岛友' }]);
        localStorage.setItem(key, value);
        window.dispatchEvent(new StorageEvent('storage', { key, newValue: value }));
      });
      fixture.push('100', '@本人合成 屏蔽消息不计入提醒');
      fixture.push('101', '未屏蔽的新消息', true);
      await expect(latest).toHaveAttribute('title', '1 条新消息，点击查看');
      await expect(page.getByRole('button', { name: /条消息 @我/ })).toHaveCount(0);
      await latest.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-message-id="101"]')).toBeInViewport();
      await expect(page.locator('[data-message-id="100"]')).toHaveCount(0);
      expect(await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: info.outputPath('blacklist-restored.png') });
      expect(errors).toEqual([]);
      expect(fixture.stats().connections).toBe(1);
      await page.goto('/chat/mini');
      await expect(page.getByText('暂无消息，连接后将在这里接收新消息')).toBeVisible();
      fixture.push('200', '小窗屏蔽消息');
      fixture.push('201', '小窗可见消息', true);
      await expect(page.locator('[data-message-id="201"]')).toBeVisible();
      await expect(page.locator('[data-message-id]')).toHaveCount(1);
      await expect(page.getByText('已屏蔽该岛友的消息')).toHaveCount(0);
      const miniMode = page.getByRole('combobox', { name: '小窗显示模式' });
      await activate(miniMode);
      await activate(page.getByRole('option', { name: '聊天气泡', exact: true }));
      await expect(page.locator('[data-message-id]')).toHaveCount(1);
      await expect(page.locator('[data-message-id="201"]')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(errors).toEqual([]);
    });
  }
