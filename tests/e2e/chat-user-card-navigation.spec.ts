import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
test.setTimeout(60_000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: user card pet, farm and moments targets`, async ({ page }) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      await page.route('**/api/user/get/vo?*', (route) =>
        route.fulfill({ json: { code: 0, data: { id: '456', userName: '合成岛友' } } }),
      );
      await page.route('**/api/follow/is-following?*', (route) =>
        route.fulfill({ json: { code: 0, data: false } }),
      );
      let petTarget = '';
      await page.route('**/api/pet/other?*', (route) => {
        petTarget = new URL(route.request().url()).searchParams.get('otherUserId') || '';
        return route.fulfill({ json: { code: 0, data: null } });
      });
      let farmTarget = '';
      await page.route('**/api/farm/friend/lands?*', (route) => {
        farmTarget = new URL(route.request().url()).searchParams.get('friendUserId') || '';
        return route.fulfill({ json: { code: 0, data: [] } });
      });
      await page.route('**/api/farm/user/info', (route) =>
        route.fulfill({ json: { code: 0, data: { userName: '合成本人', level: 1 } } }),
      );
      await page.route('**/api/crop/all', (route) =>
        route.fulfill({ json: { code: 0, data: [] } }),
      );
      let momentTarget = '';
      await page.route('**/api/moments/list', (route) => {
        momentTarget = String((route.request().postDataJSON() as { userId: string }).userId);
        return route.fulfill({ json: { code: 0, data: { records: [], total: 0 } } });
      });
      fixture.push('9001', '合成导航消息');
      const name = page
        .locator('[data-message-id="9001"]')
        .getByRole('button', { name: '查看合成岛友的用户卡片' });
      await name.click();
      const card = page.getByRole('dialog', { name: '用户卡片', exact: true });
      await card.getByRole('button', { name: '宠物', exact: true }).click();
      const pet = page.getByRole('dialog', { name: '伙伴资料', exact: true });
      await expect(pet.getByText('这位岛友还没有领养伙伴。')).toBeVisible();
      expect(petTarget).toBe('456');
      await pet.getByRole('button', { name: '关闭面板' }).click();
      await expect(card.getByRole('button', { name: '宠物', exact: true })).toBeFocused();
      await card.getByRole('button', { name: '农场', exact: true }).click();
      await expect(page).toHaveURL(/\/game\/farm\?userId=456$/);
      await expect(card).toHaveCount(0);
      await expect.poll(() => farmTarget).toBe('456');
      await expect(page.getByRole('button', { name: '回家' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.goBack();
      await name.click();
      await card.getByRole('button', { name: '动态', exact: true }).click();
      await expect(page).toHaveURL(/\/moments\/fish-circle\?userId=456$/);
      await expect.poll(() => momentTarget).toBe('456');
      await expect(card).toHaveCount(0);
      expect(fixture.stats().connections).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
