import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';
import { assertPetLayout } from './pet-layout';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: camp, care, panels and states`, async ({ page }, info) => {
        test.setTimeout(180_000);
        await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
        const state = await setupPet(page, skin.id, mode);
        await expect(page.getByRole('heading', { name: '伙伴营地', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: /小苔/ })).toBeVisible();
        await assertPetLayout(page);
        const ground = page.getByRole('button', { name: /移动伙伴/ });
        const actor = page.getByTestId('camp-actor');
        const before = await actor.getAttribute('style');
        if (width <= 760) await ground.tap({ position: { x: 180, y: 190 } });
        else {
          await ground.focus();
          await page.keyboard.down('ArrowRight');
          await expect(actor).not.toHaveAttribute('style', before!);
          await page.keyboard.up('ArrowRight');
        }
        await expect(actor).not.toHaveAttribute('style', before!);
        await page.getByRole('button', { name: /喂食 · 5/ }).click();
        await expect(page.getByText('已喂食伙伴', { exact: true })).toBeVisible();
        expect(state.actions).toContain('pet/feed');
        await page.screenshot({ path: info.outputPath('camp-ready.png'), fullPage: true });
        state.feedFail = true;
        await page.getByRole('button', { name: /抚摸 · 3/ }).click();
        await expect(page.getByRole('alert')).toContainText('尚在冷却');
        state.feedFail = false;
        await page.screenshot({ path: info.outputPath('camp.png'), fullPage: true });
        for (const title of [
          '伙伴档案',
          '行囊',
          '外观',
          '物品手册',
          '补给铺',
          '自动喂食',
          '锻造台',
          '挑战',
          '幸运补给',
        ]) {
          await page.getByRole('button', { name: new RegExp(`^${title}`) }).click();
          const dialog = page.getByRole('dialog', { name: title, exact: true });
          await expect(dialog).toBeVisible();
          await expect(dialog.getByText('正在整理营地资料…')).toHaveCount(0);
          await assertPetLayout(page);
          const viewport = dialog.locator('[data-radix-scroll-area-viewport]');
          await viewport.hover();
          if (title === '行囊' && width <= 760) {
            const bounds = (await viewport.boundingBox())!;
            const cdp = await page.context().newCDPSession(page);
            const x = bounds.x + 24;
            const y = bounds.y + bounds.height * 0.75;
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchStart',
              touchPoints: [{ x, y }],
            });
            for (let step = 1; step <= 8; step++) {
              await cdp.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ x, y: y - step * 24 }],
              });
            }
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await cdp.detach();
            await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
            await expect(viewport.locator('..').locator('[data-orientation="vertical"]')).toHaveCSS(
              'visibility',
              'hidden',
            );
          }
          if (title === '行囊' && width > 760) {
            const track = viewport.locator('..').locator('[data-orientation="vertical"]');
            await expect(track).toBeVisible();
            await expect(track).toHaveCSS('opacity', '1');
          }
          await viewport.evaluate((element) => {
            element.scrollTop = element.scrollHeight / 2;
          });
          await assertPetLayout(page);
          await viewport.evaluate((element) => {
            element.scrollTop = element.scrollHeight;
          });
          await assertPetLayout(page);
          if (title === '行囊') {
            await dialog.getByRole('button', { name: '穿戴', exact: true }).first().click();
            await expect.poll(() => state.actions.includes('equip')).toBe(true);
            await expect(dialog.getByRole('button', { name: '卸下', exact: true })).toBeVisible();
            const equipment = dialog.getByRole('heading', { name: /^已穿戴/ }).locator('..');
            const icon = equipment.getByRole('img', { name: '苔纹护腕', exact: true });
            await expect(icon).toBeVisible();
            await expect
              .poll(() => icon.evaluate((img: HTMLImageElement) => img.naturalWidth))
              .toBeGreaterThan(0);
          }
          if (title === '伙伴档案') {
            await dialog.getByRole('textbox', { name: '伙伴名字' }).fill('小苔新名字');
            await dialog.getByRole('button', { name: '保存名字', exact: true }).click();
            await expect.poll(() => state.pet.name).toBe('小苔新名字');
          }
          if (title === '挑战') {
            await dialog.getByRole('combobox', { name: '挑战分类' }).click();
            await page.getByRole('option', { name: '首领挑战', exact: true }).click();
            await dialog.getByRole('button', { name: '查看挑战', exact: true }).click();
            await dialog.getByRole('button', { name: '开始挑战', exact: true }).click();
            const skip = dialog.getByRole('button', { name: '跳过演出', exact: true });
            await expect(skip).toBeVisible();
            await skip.click();
            await expect(
              dialog.getByRole('heading', { name: '挑战胜利', exact: true }),
            ).toBeVisible();
            expect(state.battleCount).toBe(1);
          }
          if (title === '行囊' || title === '挑战')
            await page.screenshot({ path: info.outputPath(`${title}.png`), fullPage: true });
          await dialog.getByRole('button', { name: '关闭面板', exact: true }).click();
          await expect(dialog).not.toBeVisible();
        }
        const requests = state.mineRequests;
        const position = await actor.getAttribute('style');
        // Inner mobile routes intentionally hide global navigation (ADR-032).
        // Resize the same mounted page to access the global appearance controls.
        if (width <= 760) await page.setViewportSize({ width: 1440, height: 1000 });
        await page.getByRole('button', { name: '切换主题', exact: true }).click();
        const picker = page.getByRole('dialog', { name: '主题模式' });
        await picker
          .getByRole('button', { name: skin.id === 'wps' ? '微信绿' : 'WPS 表格', exact: true })
          .click();
        await picker
          .getByRole('button', { name: mode === 'light' ? '暗夜模式' : '明亮模式', exact: true })
          .click();
        await picker.getByRole('button', { name: skin.name, exact: true }).click();
        await picker
          .getByRole('button', { name: mode === 'light' ? '明亮模式' : '暗夜模式', exact: true })
          .click();
        await picker.getByRole('button', { name: '关闭', exact: true }).click();
        if (width <= 760) await page.setViewportSize({ width, height: 844 });
        expect(state.mineRequests).toBe(requests);
        await expect(actor).toHaveAttribute('style', position!);
        await expect(page.getByRole('heading', { name: /小苔新名字/ })).toBeVisible();
        state.panelFail = true;
        await page.getByRole('button', { name: /^行囊/ }).click();
        const bag = page.getByRole('dialog', { name: '行囊', exact: true });
        await expect(bag.getByRole('alert')).toContainText('读取失败');
        await assertPetLayout(page);
        state.panelFail = false;
        state.panelEmpty = true;
        await bag.getByRole('button', { name: '重试', exact: true }).click();
        await expect(bag.getByRole('heading', { name: '行囊还是空的' })).toBeVisible();
        await assertPetLayout(page);
        await bag.getByRole('button', { name: '关闭面板', exact: true }).click();
        state.empty = true;
        state.hold = true;
        await page.reload();
        await expect(page.getByText('正在整理营地资料…', { exact: true })).toBeVisible({
          timeout: 30000,
        });
        await assertPetLayout(page);
        state.hold = false;
        state.release();
        await expect(page.getByRole('heading', { name: '营地正等着第一位伙伴' })).toBeVisible();
        await assertPetLayout(page);
        await page.getByRole('textbox', { name: '新伙伴名字' }).fill('新伙伴');
        await page.getByRole('button', { name: '领养伙伴', exact: true }).click();
        await expect(page.getByRole('heading', { name: /新伙伴.*Lv/ })).toBeVisible();
        state.fail = true;
        await page.reload();
        await expect(page.getByRole('heading', { name: '伙伴营地', exact: true })).toBeVisible({
          timeout: 90000,
        });
        await expect(page.getByRole('alert')).toContainText('合成读取失败');
        await assertPetLayout(page);
        state.fail = false;
        await page.getByRole('button', { name: '重试', exact: true }).click();
        await expect(page.getByRole('heading', { name: /新伙伴.*Lv/ })).toBeVisible();
      });
    }
