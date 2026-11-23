import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { shortcutFixture } from './chat-game-shortcuts-fixture';
import { setupChatMenu } from './chat-menu-fixture';
import { setupPetCardCatalog } from './pet-card-catalog-fixture';
import { activate } from './pet-cards-flow';

test.use({ hasTouch: true });

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390])
      for (const role of ['user', 'admin']) {
        test(`pet card access ${skin.id} ${mode} ${width} ${role}`, async ({ page }) => {
          const mobile = width <= 760;
          const admin = role === 'admin';
          await page.setViewportSize({ width, height: 900 });
          let catalogRequests: string[] = [];
          const chat = await setupChatMenu(page, skin.id, mode, role, async () => {
            await shortcutFixture(page);
            catalogRequests = await setupPetCardCatalog(page);
          });
          const cards = page.getByRole('dialog', { name: '宠物卡包试玩', exact: true });
          await activate(
            page
              .getByRole('button', { name: '打开宠物悬浮窗', exact: true })
              .filter({ visible: true }),
            mobile,
          );
          const pet = page.getByRole('dialog', { name: '伙伴营地', exact: true });
          await expect(pet.getByRole('heading', { name: '合成伙伴 Lv.8' })).toBeVisible();
          const entry = pet.getByRole('button', { name: '宠物卡包', exact: true });
          if (admin) {
            await activate(entry, mobile);
            await expect(cards.getByRole('button', { name: '领取卡包' })).toBeEnabled();
            expect(catalogRequests).toHaveLength(1);
          } else {
            await expect(entry).toHaveCount(0);
          }
          chat.dispose();

          await page.goto('/pet?panel=cards', { waitUntil: 'domcontentloaded' });
          if (admin) {
            await expect(cards.getByRole('button', { name: '领取卡包' })).toBeEnabled();
            expect(catalogRequests).toHaveLength(2);
          } else {
            const tools = page.getByRole('navigation', { name: '伙伴功能', exact: true });
            await expect(tools.getByRole('button', { name: '行囊', exact: true })).toBeEnabled();
            await expect(tools.getByRole('button', { name: '宠物卡包', exact: true })).toHaveCount(
              0,
            );
            await expect(cards).toHaveCount(0);
            expect(catalogRequests).toHaveLength(0);
          }
        });
      }
