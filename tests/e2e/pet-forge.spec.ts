import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';
import { assertPetLayout } from './pet-layout';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: localized stats and forge layout`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
        const state = await setupPet(page, skin.id, mode);
        Object.assign(state.pet.equipStats, {
          critRate: 0.14920000000000003,
          critResistance: 0.12000000000000001,
        });
        await page.reload();
        await page.getByRole('button', { name: /^伙伴档案/ }).click();
        const care = page.getByRole('dialog', { name: '伙伴档案', exact: true });
        await expect(care.getByText('14.92%', { exact: true })).toBeVisible();
        await expect(care.getByText('12%', { exact: true })).toBeVisible();
        await assertPetLayout(page);
        await care.getByRole('button', { name: '关闭面板', exact: true }).click();

        let phase = 'hold';
        let release = () => {};
        await page.route('**/api/pet/forge/detail', async (route) => {
          if (phase === 'hold')
            await new Promise<void>((resolve) => {
              release = resolve;
            });
          await route.fulfill({
            json:
              phase === 'error'
                ? { code: 40000, message: '锻造资料读取失败，请重试' }
                : {
                    code: 0,
                    data: {
                      equipLevel: state.forgeLevel,
                      successRate: 1.0000000000000002,
                      nextUpgradeCost: 370,
                      maxLevel: phase === 'max',
                      ...(phase === 'empty'
                        ? {}
                        : Object.fromEntries(
                            [
                              ['critRate', 0.14920000000000003],
                              ['antiBlock', 0.0192],
                              ['maxHp', 270],
                              ['antiLifesteal', 0.0126],
                            ].map(([attr, value], i) => [
                              `entry${i + 1}`,
                              {
                                attr,
                                value,
                                locked: state.locked.includes(i + 1),
                                grade:
                                  phase === 'white' ? 1 : phase === 'unknown' ? undefined : i + 2,
                              },
                            ]),
                          )),
                    },
                  },
          });
        });
        await page.getByRole('button', { name: /^锻造台/ }).click();
        const forge = page.getByRole('dialog', { name: '锻造台', exact: true });
        await expect(forge.getByText('正在整理营地资料…')).toBeVisible();
        await assertPetLayout(page);
        phase = 'ready';
        release();
        await expect(forge.getByText('+14.92%', { exact: true })).toBeVisible();
        await expect(forge.getByText('格挡抵抗', { exact: true })).toBeVisible();
        await expect(forge.getByText('+1.92%', { exact: true })).toBeVisible();
        await expect(forge.getByText('生命', { exact: true })).toBeVisible();
        await expect(forge.getByText('+270', { exact: true })).toBeVisible();
        await expect(forge.getByText('汲取抵抗', { exact: true })).toBeVisible();
        await expect(forge.getByText('+1.26%', { exact: true })).toBeVisible();
        await expect(forge.getByText('1%', { exact: true })).toBeVisible();
        await expect(forge.getByText(/antiBlock|antiLifesteal|maxHp|000000000/)).toHaveCount(0);
        for (const grade of ['蓝', '紫', '金', '红'])
          await expect(forge.getByLabel(`词条品质：${grade}`, { exact: true })).toBeVisible();
        const gradeColors = await forge
          .locator('[data-grade] > strong')
          .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).color));
        expect(new Set(gradeColors).size).toBe(4);
        await assertPetLayout(page);
        const row = forge.getByText('+14.92%', { exact: true }).locator('..');
        const rowLayout = await row.evaluate((el) => {
          const [label, value, button] = Array.from(el.children).map((child) =>
            child.getBoundingClientRect(),
          );
          return {
            separated: label!.right < value!.left && value!.right < button!.left,
            overflow: el.scrollWidth > el.clientWidth,
          };
        });
        expect(rowLayout).toEqual({ separated: true, overflow: false });
        const lockButton = forge.getByRole('button', { name: '锁定', exact: true }).first();
        if (width <= 760) await lockButton.tap();
        else await lockButton.click();
        await expect(forge.getByRole('button', { name: '解锁', exact: true })).toBeVisible();
        if (width <= 760) {
          const viewport = forge.getByRole('region', { name: '锻造台内容', exact: true });
          const bounds = (await viewport.boundingBox())!;
          const cdp = await page.context().newCDPSession(page);
          const x = bounds.x + 16;
          const y = bounds.y + bounds.height * 0.8;
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y }],
          });
          for (let step = 1; step <= 8; step++)
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x, y: y - step * 24 }],
            });
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
          await viewport.evaluate(async (el) => {
            let previous = el.scrollTop;
            let stableFrames = 0;
            while (stableFrames < 5) {
              await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
              stableFrames = el.scrollTop === previous ? stableFrames + 1 : 0;
              previous = el.scrollTop;
            }
          });
          await expect(viewport.locator('..').locator('[data-orientation="vertical"]')).toHaveCSS(
            'visibility',
            'hidden',
          );
          await cdp.detach();
        }
        await expect(forge.getByRole('button', { name: '解锁', exact: true })).toBeVisible();
        await expect(forge.getByText('已锁定 · 刷新时保留')).toBeVisible();
        await forge.getByRole('button', { name: '刷新词条', exact: true }).click();
        const confirm = page.getByRole('dialog', { name: '刷新词条', exact: true });
        await expect(confirm.getByRole('region', { name: '操作确认内容' })).toContainText(
          '150 积分',
        );
        await confirm.getByRole('button', { name: '取消', exact: true }).click();
        await expect(forge.getByRole('button', { name: '刷新词条', exact: true })).toBeFocused();
        const select = forge.getByRole('combobox', { name: '锻造部位' });
        await select.click();
        await page.keyboard.press('Escape');
        await expect(select).toBeFocused();
        await expect(forge).toBeVisible();
        await page.screenshot({ path: info.outputPath('forge.png') });
        phase = 'error';
        await select.click();
        await page.getByRole('option', { name: '羽翼', exact: true }).click();
        await expect(forge.getByRole('alert')).toContainText('读取失败');
        await assertPetLayout(page);
        phase = 'empty';
        await forge.getByRole('button', { name: '重试', exact: true }).click();
        await expect(forge.getByText('此部位暂无词条。')).toBeVisible();
        await assertPetLayout(page);
        phase = 'white';
        await select.click();
        await page.getByRole('option', { name: '手部', exact: true }).click();
        await expect(forge.getByLabel('词条品质：白', { exact: true })).toHaveCount(4);
        phase = 'unknown';
        await select.click();
        await page.getByRole('option', { name: '足部', exact: true }).click();
        await expect(forge.getByLabel('词条品质：未分级', { exact: true })).toHaveCount(4);
        phase = 'max';
        await select.click();
        await page.getByRole('option', { name: '武器', exact: true }).click();
        await expect(
          forge.getByRole('button', { name: '已达最高等级', exact: true }),
        ).toBeDisabled();
        await forge.getByRole('button', { name: '关闭面板', exact: true }).click();
        await expect(page.getByRole('button', { name: /^锻造台/ })).toBeFocused();
      });
    }
