import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';
import { assertPetLayout } from './pet-layout';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: profiles, contribution ranks and batch disposal`, async ({
        page,
      }) => {
        test.setTimeout(90000);
        await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
        const state = await setupPet(page, skin.id, mode);
        await page.getByRole('button', { name: /^挑战/ }).click();
        const challenge = page.getByRole('dialog', { name: '挑战', exact: true });
        await challenge.getByRole('button', { name: '资料', exact: true }).click();
        const profile = page.getByRole('dialog', { name: '伙伴资料', exact: true });
        await expect(profile.getByRole('heading', { name: /栗栗/ })).toBeVisible();
        await assertPetLayout(page);
        await profile.getByRole('button', { name: '关闭面板', exact: true }).click();
        await challenge.getByRole('combobox', { name: '挑战分类' }).click();
        await page.getByRole('option', { name: '首领挑战', exact: true }).click();
        await challenge.getByRole('button', { name: '贡献排行', exact: true }).click();
        const ranks = page.getByRole('dialog', { name: '首领贡献排行', exact: true });
        await expect(ranks.getByText('伤害 125', { exact: true })).toBeVisible();
        await assertPetLayout(page);
        await ranks.getByRole('button', { name: '关闭面板', exact: true }).click();
        await challenge.getByRole('button', { name: '关闭面板', exact: true }).click();
        await page.getByRole('button', { name: /^行囊/ }).click();
        const bag = page.getByRole('dialog', { name: '行囊', exact: true });
        await bag.getByRole('button', { name: '批量分解', exact: true }).click();
        const confirm = page.getByRole('dialog', { name: '批量分解', exact: true });
        await expect(confirm).toContainText('操作无法恢复');
        await confirm.getByRole('button', { name: '确认', exact: true }).click();
        await expect(bag.getByRole('status')).toContainText('获得 20 积分');
        await expect(bag.getByRole('heading', { name: '行囊还是空的', exact: true })).toBeVisible();
        expect(state.actions.filter((action) => action === 'batch')).toHaveLength(1);
        await assertPetLayout(page);
      });
    }
