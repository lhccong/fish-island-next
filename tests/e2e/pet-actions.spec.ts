import { expect, test, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';
import { assertPetLayout } from './pet-layout';

async function openPanel(page: Page, title: string) {
  await page.getByRole('button', { name: new RegExp(`^${title}`) }).click();
  const dialog = page.getByRole('dialog', { name: title, exact: true });
  await expect(dialog.getByText('正在整理营地资料…')).toHaveCount(0);
  return dialog;
}
async function closePanel(page: Page) {
  await page.getByRole('button', { name: '关闭面板', exact: true }).click();
}
async function confirm(page: Page, title: string) {
  const dialog = page.getByRole('dialog', { name: title, exact: true });
  await assertPetLayout(page);
  await dialog.getByRole('button', { name: '确认', exact: true }).click();
  await expect(dialog).not.toBeVisible();
}
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: confirmed actions and server results`, async ({
        page,
      }, info) => {
        test.setTimeout(90_000);
        await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
        const state = await setupPet(page, skin.id, mode);
        await expect(page.getByRole('heading', { name: /小苔/ })).toBeVisible();
        let dialog = await openPanel(page, '行囊');
        const decompose = dialog.getByRole('button', { name: '分解', exact: true }).first();
        await decompose.click();
        await page
          .getByRole('dialog', { name: '分解', exact: true })
          .getByRole('button', { name: '取消', exact: true })
          .click();
        await expect(decompose).toBeFocused();
        expect(state.actions).not.toContain('decompose');
        await decompose.click();
        await confirm(page, '分解');
        await expect.poll(() => state.actions.includes('decompose')).toBe(true);
        await closePanel(page);
        dialog = await openPanel(page, '补给铺');
        await dialog.getByRole('button', { name: '购买 · 20 积分', exact: true }).first().click();
        await confirm(page, '购买 · 20 积分');
        expect(state.actions.filter((a) => a === 'purchase')).toHaveLength(1);
        await closePanel(page);
        dialog = await openPanel(page, '外观');
        await dialog.getByRole('button', { name: '兑换 · 30 积分', exact: true }).click();
        await confirm(page, '兑换 · 30 积分');
        await dialog.getByRole('button', { name: '使用外观', exact: true }).click();
        await expect(dialog.getByRole('button', { name: '正在使用', exact: true })).toBeDisabled();
        expect(state.skinUsed).toBe(true);
        await closePanel(page);
        dialog = await openPanel(page, '自动喂食');
        await dialog.getByRole('textbox', { name: '食物编号' }).fill('synthetic_food');
        await dialog.getByRole('spinbutton', { name: /触发饱食值/ }).fill('40');
        await dialog.getByRole('checkbox', { name: '启用自动喂食' }).check();
        await dialog.getByRole('button', { name: '保存设置', exact: true }).click();
        await expect(dialog.getByRole('status')).toContainText('自动喂食设置已保存');
        expect(state.auto?.triggerThreshold).toBe(40);
        await closePanel(page);
        dialog = await openPanel(page, '自动喂食');
        await expect(dialog.getByRole('checkbox', { name: '启用自动喂食' })).toBeChecked();
        await expect(dialog.getByRole('spinbutton')).toHaveValue('40');
        await closePanel(page);
        dialog = await openPanel(page, '锻造台');
        const select = dialog.getByRole('combobox', { name: '锻造部位' });
        await select.click();
        await page.getByRole('option', { name: '头部', exact: true }).click();
        await expect(select).toBeFocused();
        await dialog.getByRole('button', { name: '锁定', exact: true }).first().click();
        await expect(dialog.getByRole('button', { name: '解锁', exact: true })).toBeVisible();
        expect(state.locked).toEqual([1]);
        await dialog.getByRole('button', { name: '升级 · 20 积分', exact: true }).click();
        await confirm(page, '升级 · 20 积分');
        await expect(dialog.getByText('升级成功', { exact: true })).toBeVisible();
        expect(state.forgeLevel).toBe(2);
        await dialog.getByRole('button', { name: '刷新词条', exact: true }).click();
        await expect(page.getByRole('dialog', { name: '刷新词条', exact: true })).toContainText(
          '150 积分',
        );
        await confirm(page, '刷新词条');
        await page.screenshot({ path: info.outputPath('forge.png'), fullPage: true });
        await closePanel(page);
        dialog = await openPanel(page, '挑战');
        await dialog.getByRole('combobox', { name: '挑战分类' }).click();
        await page.getByRole('option', { name: '每日排位', exact: true }).click();
        await dialog.getByRole('button', { name: '挑战排位', exact: true }).click();
        await confirm(page, '挑战排位');
        await expect(dialog.getByRole('status')).toContainText('挑战胜利');
        expect(state.activity.competitions).toBe(1);
        await dialog.getByRole('combobox', { name: '挑战分类' }).click();
        await page.getByRole('option', { name: '逐层试炼', exact: true }).click();
        await dialog.getByRole('button', { name: '查看试炼', exact: true }).click();
        await dialog.getByRole('button', { name: '开始挑战', exact: true }).click();
        await dialog.getByRole('button', { name: '跳过演出', exact: true }).click();
        await expect(
          dialog.getByText('本次累计伤害 90 · 获得 10 积分', { exact: true }),
        ).toBeVisible();
        await dialog.getByRole('button', { name: '返回挑战列表', exact: true }).click();
        await dialog.getByRole('combobox', { name: '挑战分类' }).click();
        await page.getByRole('option', { name: '伙伴排行与切磋', exact: true }).click();
        await dialog.getByRole('button', { name: '切磋', exact: true }).click();
        state.failBattle = true;
        await dialog.getByRole('button', { name: '开始挑战', exact: true }).click();
        await expect(dialog.getByRole('alert')).toContainText('挑战次数不足');
        await expect(dialog.getByRole('heading', { name: '挑战胜利', exact: true })).toHaveCount(0);
        await closePanel(page);
        dialog = await openPanel(page, '幸运补给');
        await dialog.getByRole('button', { name: '领取一次', exact: true }).click();
        await confirm(page, '领取一次');
        await expect(
          dialog.getByRole('heading', { name: '本次补给 · 消耗 10 积分', exact: true }),
        ).toBeVisible();
        await dialog.getByRole('button', { name: '领取十次', exact: true }).click();
        await confirm(page, '领取十次');
        await expect(
          dialog.getByRole('heading', { name: '本次补给 · 消耗 100 积分', exact: true }),
        ).toBeVisible();
        expect(state.activity.draws).toBe(2);
        expect(state.activity.drawCount).toBe(11);
        await assertPetLayout(page);
        await closePanel(page);
      });
    }
