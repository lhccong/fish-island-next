import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';
import { assertPetLayout } from './pet-layout';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: battle effect feedback`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
        await page.clock.install();
        const state = await setupPet(page, skin.id, mode);
        state.battleEffects = true;
        await page.getByRole('button', { name: /^宠物 Boss/ }).click();
        const dialog = page.getByRole('dialog', { name: '挑战', exact: true });
        await dialog.getByRole('button', { name: '开始挑战', exact: true }).click();
        const gear = dialog.getByRole('region', { name: '小苔出战装备' });
        await expect(gear.getByRole('img', { name: /未装备$/ })).toHaveCount(6);
        const gearBox = (await gear.boundingBox())!;
        const hp = (await dialog.getByRole('progressbar', { name: '小苔生命' }).boundingBox())!;
        expect(gearBox.y).toBeGreaterThan(hp.y + hp.height);
        const stage = dialog.locator('[aria-label="挑战演出"]');
        for (const side of ['self', 'opponent']) {
          const panel = (await stage.locator(`section[data-side="${side}"]`).boundingBox())!;
          const fighter = (await stage.locator(`div[data-side="${side}"]`).boundingBox())!;
          expect(panel.y).toBeGreaterThanOrEqual(fighter.y + fighter.height);
          expect(Math.abs(panel.x + panel.width / 2 - fighter.x - fighter.width / 2)).toBeLessThan(
            30,
          );
        }
        await assertPetLayout(page);
        await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60000));
        await dialog.getByRole('button', { name: '开始挑战', exact: true }).click();
        await dialog.locator('[aria-label="挑战演出"]').scrollIntoViewIfNeeded();
        for (const effect of ['dodge', 'block', 'combo', 'critical']) {
          const label = dialog.locator(`[data-effect="${effect}"]`);
          await expect(label).toBeVisible();
          if (effect === 'combo')
            await expect(dialog.locator('[data-effect="heal"]')).toHaveText('吸血 +5');
          if (skin.id === 'wechat')
            await dialog
              .locator('[aria-label="挑战演出"]')
              .screenshot({ path: info.outputPath(`${effect}.png`) });
          await page.clock.runFor(900);
        }
        await expect(dialog.getByRole('heading', { name: '挑战胜利', exact: true })).toBeVisible();
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await dialog.getByRole('button', { name: '重播战斗' }).click();
        const dodge = dialog.locator('[data-effect="dodge"]');
        await expect(dodge).toBeVisible();
        await expect(dodge).toHaveCSS('animation-name', 'none');
        expect(
          await dialog
            .locator('[data-side="opponent"]')
            .last()
            .evaluate(
              (el) =>
                el
                  .getAnimations({ subtree: true })
                  .filter((animation) => animation.playState === 'running').length,
            ),
        ).toBe(0);
        await dialog.getByRole('button', { name: '跳过演出' }).click();
        expect(state.battleCount).toBe(1);
        await assertPetLayout(page);
        await dialog.getByRole('button', { name: '关闭面板' }).click();
      });
    }
