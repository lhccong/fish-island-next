import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';
import { assertPetLayout } from './pet-layout';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: duel health and compact equipment ownership`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
        const state = await setupPet(page, skin.id, mode);
        await page.getByRole('button', { name: /^行囊/ }).click();
        const bag = page.getByRole('dialog', { name: '行囊', exact: true });
        await bag.getByRole('button', { name: '穿戴', exact: true }).first().click();
        await expect(bag.getByRole('button', { name: '卸下', exact: true })).toBeVisible();
        await bag.getByRole('button', { name: '关闭面板' }).click();
        await page.getByRole('button', { name: /^挑战/ }).click();
        const dialog = page.getByRole('dialog', { name: '挑战', exact: true });
        await dialog.getByRole('button', { name: '切磋', exact: true }).click();
        const stage = dialog.locator('[aria-label="挑战演出"]');
        await expect(dialog.getByRole('heading', { name: '伙伴切磋', exact: true })).toBeVisible();
        for (const [side, name] of [
          ['self', '小苔'],
          ['opponent', '栗栗'],
        ]) {
          const panel = stage.locator(`section[data-side="${side}"]`);
          await expect(panel).toContainText(side === 'self' ? '我方' : '对手');
          const gear = panel.getByRole('region', { name: `${name}出战装备` });
          const icon = gear.getByRole('img', { name: '手部：苔纹护腕', exact: true });
          await expect(icon).toBeVisible();
          expect((await icon.boundingBox())!.width).toBe(20);
          await expect(gear.getByRole('img', { name: /未装备$/ })).toHaveCount(5);
          const statusBounds = (await panel.boundingBox())!;
          const fighterBounds = (await stage.locator(`div[data-side="${side}"]`).boundingBox())!;
          expect(statusBounds.y).toBeGreaterThanOrEqual(fighterBounds.y + fighterBounds.height);
          expect(
            Math.abs(
              statusBounds.x + statusBounds.width / 2 - fighterBounds.x - fighterBounds.width / 2,
            ),
          ).toBeLessThan(30);
          expect(await gear.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        }
        await assertPetLayout(page);
        if (skin.id === 'wechat') {
          await stage.scrollIntoViewIfNeeded();
          await stage.screenshot({ path: info.outputPath('duel.png') });
        }
        expect(state.battleCount).toBe(0);
        await dialog.getByRole('button', { name: '关闭面板' }).click();
      });
    }
