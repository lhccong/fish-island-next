import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';
import { assertPetLayout } from './pet-layout';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: care stays mounted and food picker recovers`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
        const state = await setupPet(page, skin.id, mode);
        const heading = page.getByRole('heading', { name: /小苔/ });
        await expect(heading).toBeVisible();
        const element = await heading.elementHandle();
        const feed = page.getByRole('button', { name: '喂食 · 5 积分', exact: true });
        await feed.scrollIntoViewIfNeeded();
        const before = (await feed.boundingBox())!;
        const requests = state.mineRequests;
        let release = () => {};
        let submitted = false;
        await page.route('**/api/pet/feed?*', async (route) => {
          submitted = true;
          await new Promise<void>((resolve) => {
            release = resolve;
          });
          state.pet.hunger = 92;
          state.pet.mood = 96;
          await route.fulfill({ json: { code: 0, data: state.pet } });
        });
        await feed.click();
        await expect.poll(() => submitted).toBe(true);
        await expect(page.getByText('正在照料…', { exact: true })).toBeVisible();
        await expect(feed).toBeDisabled();
        expect(await element!.evaluate((el) => el.isConnected)).toBe(true);
        expect((await feed.boundingBox())!.y).toBe(before.y);
        release();
        await expect(page.getByRole('meter', { name: '饱食', exact: true })).toHaveAttribute(
          'value',
          '92',
        );
        await expect(feed).toBeEnabled();
        expect(await element!.evaluate((el) => el.isConnected)).toBe(true);
        expect(state.mineRequests).toBe(requests);
        await expect(page.getByText('已喂食伙伴', { exact: true })).toHaveCount(0);
        const backdrop = await page
          .getByRole('region', { name: '伙伴营地', exact: true })
          .evaluate((el) => {
            const css = getComputedStyle(el, '::before');
            return { image: css.backgroundImage, opacity: css.opacity, events: css.pointerEvents };
          });
        expect(backdrop.image).toContain('home-island.png');
        expect(backdrop.opacity).toBe(mode === 'dark' ? '0.32' : '0.56');
        expect(backdrop.events).toBe('none');
        state.foodsFail = true;
        await page.getByRole('button', { name: '设置自动喂食', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: '自动喂食', exact: true });
        await expect(dialog.getByRole('button', { name: '重试食物', exact: true })).toBeVisible();
        await dialog.getByRole('spinbutton', { name: /触发饱食值/ }).fill('45');
        state.foodsFail = false;
        await dialog.getByRole('button', { name: '重试食物', exact: true }).click();
        const select = dialog.getByRole('combobox', { name: '选择食物', exact: true });
        await select.click();
        await expect(page.getByRole('option', { name: '普通鱼饼 ×6', exact: true })).toBeVisible();
        await assertPetLayout(page);
        await page.screenshot({ path: info.outputPath('food-options.png') });
        await page.keyboard.press('Escape');
        await expect(select).toBeFocused();
        await select.press('ArrowDown');
        await page.getByRole('option', { name: '普通鱼饼 ×6', exact: true }).press('Enter');
        await expect(select).toContainText('普通鱼饼 ×6');
        await expect(dialog.getByRole('spinbutton')).toHaveValue('45');
        await dialog.getByRole('checkbox', { name: '启用自动喂食' }).check();
        await dialog.getByRole('button', { name: '保存设置', exact: true }).click();
        await expect(dialog.getByText('自动喂食设置已保存', { exact: true })).toBeVisible();
        expect(state.auto?.foodCode).toBe('synthetic_food');
        expect(state.auto?.triggerThreshold).toBe(45);
        await dialog.getByRole('button', { name: '关闭面板', exact: true }).click();
        state.foodsEmpty = true;
        await page.getByRole('button', { name: '设置自动喂食', exact: true }).click();
        await expect(
          dialog.getByText('背包暂无可用食物，可前往补给铺购买。', { exact: true }),
        ).toBeVisible();
        await expect(select).toContainText('暂无库存');
        await dialog.getByRole('checkbox', { name: '启用自动喂食' }).uncheck();
        await dialog.getByRole('button', { name: '保存设置', exact: true }).click();
        await expect.poll(() => state.auto?.enabled).toBe(0);
        await assertPetLayout(page);
      });
    }
