import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { openMessageActions } from './chat-message-actions';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: reward cards cannot be repeated`, async ({ page }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const mobile = page.viewportSize()!.width <= 760;
      let sends = 0;
      await page.route('**/api/chat/message/send', (route) => {
        sends++;
        return route.fulfill({ json: { code: 50001, message: '合成发送拒绝' } });
      });
      await page.route('**/api/redpacket/detail?*', (route) =>
        route.fulfill({
          json: { code: 0, data: { type: 1, status: 0, remainingCount: 1, name: '合成红包' } },
        }),
      );
      await page.route('**/api/luckybag/detail?*', (route) =>
        route.fulfill({
          json: {
            code: 0,
            data: {
              id: 'synthetic',
              name: '合成福袋',
              creatorName: '合成',
              type: 1,
              status: 0,
              joined: false,
              totalAmount: 50,
              winnerCount: 5,
              participantCount: 0,
              drawTime: Date.now() + 60000,
            },
          },
        }),
      );
      await page.route('https://oss.cqbo.com/moyu/fudai.jpg', (route) => route.abort());
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('保留草稿');
      for (const [index, tag] of ['redpacket', 'luckybag'].entries()) {
        const first = index * 3 + 1;
        for (let offset = 0; offset < 3; offset++)
          fixture.push(String(first + offset), `前文[${tag}]synthetic[/${tag}]后文`);
        const row = page.locator(`[data-message-id="${first + 2}"]`);
        await expect(row).toBeVisible();
        await expect(page.getByRole('group', { name: /^连续复读：/ })).toHaveCount(0);
        await expect(page.getByRole('button', { name: '加一复读' })).toHaveCount(0);
        let menu = await openMessageActions(page, String(first + 2));
        await expect(menu).toBeVisible();
        await expect(menu.getByRole('menuitem', { name: '复读机', exact: true })).toHaveCount(0);
        await expect(menu.getByRole('menuitem', { name: '复制', exact: true })).toBeVisible();
        await expect(menu.getByRole('menuitem', { name: '引用', exact: true })).toBeVisible();
        await page.screenshot({ path: info.outputPath(`${tag}-menu.png`) });
        await page.keyboard.press('Escape');
        const bubble = row.getByRole('group').first();
        await expect(bubble).toBeFocused();
        await bubble.press('Shift+F10');
        menu = page.getByRole('menu');
        await expect(menu).toBeVisible();
        await expect(menu.getByRole('menuitem', { name: '复读机', exact: true })).toHaveCount(0);
        await page.keyboard.press('Escape');
      }
      expect(sends).toBe(0);
      fixture.push('7', '普通文字仍可复读');
      const normalMenu = await openMessageActions(page, '7');
      const normalRepeat = normalMenu.getByRole('menuitem', { name: '复读机', exact: true });
      if (mobile) await normalRepeat.tap();
      else await normalRepeat.click();
      await expect.poll(() => sends).toBe(1);
      await expect(draft).toHaveText('保留草稿');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
