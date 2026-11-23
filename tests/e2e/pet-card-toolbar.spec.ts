import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { shortcutFixture } from './chat-game-shortcuts-fixture';
import { setupChatMenu } from './chat-menu-fixture';
import { activate } from './pet-cards-flow';

test.setTimeout(60_000);
test.use({ hasTouch: true, reducedMotion: 'reduce' });

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`pet card toolbar ${skin.id} ${mode} ${width}`, async ({ page }) => {
        const mobile = width <= 760;
        await page.setViewportSize({ width, height: 844 });
        await setupChatMenu(
          page,
          skin.id,
          mode,
          'user',
          async () => {
            await shortcutFixture(page);
          },
          false,
          '1',
        );
        const toolbar = page.getByRole('navigation', { name: '伙伴功能' });
        const entry = toolbar.getByRole('button', { name: '宠物卡包', exact: true });
        const openWindow = () =>
          activate(
            page.getByRole('button', { name: '打开宠物悬浮窗', exact: true }).filter({
              visible: true,
            }),
            mobile,
          );
        const cardDialog = page.getByRole('dialog', { name: '宠物卡包', exact: true });
        await openWindow();
        await activate(entry, mobile);
        await expect(cardDialog).toBeVisible();

        await page.goto('/pet', { waitUntil: 'domcontentloaded' });
        await activate(entry, mobile);
        await expect(cardDialog).toBeVisible();
        await activate(cardDialog.getByRole('button', { name: '关闭宠物卡包' }), mobile);
        await expect(entry).toBeFocused();

        await page.route('**/api/user/get/login', (route) =>
          route.fulfill({
            json: { code: 0, data: { id: '123', userName: '合成测试', userRole: 'admin' } },
          }),
        );
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(toolbar.getByRole('button', { name: '抽奖转盘' })).toBeVisible();
        await expect(entry).toHaveCount(0);
        await page.goto('/chat', { waitUntil: 'domcontentloaded' });
        await openWindow();
        await expect(toolbar.getByRole('button', { name: '抽奖转盘' })).toBeVisible();
        await expect(entry).toHaveCount(0);
        expect(await toolbar.evaluate((nav) => nav.scrollWidth <= nav.clientWidth)).toBe(true);
      });
    }
