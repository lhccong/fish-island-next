import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';
import { assertPetLayout } from './pet-layout';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: equipment enhancement badges`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
        const state = await setupPet(page, skin.id, mode);
        const slots = ['head', 'weapon', 'necklace', 'wing', 'foot', 'hand'];
        const levels = [1, 4, 7, 10, 15, 16];
        const items = levels.map((level, index) => ({
          id: String(600 + index),
          quantity: 1,
          enhanceLevel: level,
          template: {
            id: String(50 + index),
            name: `测试装备${level}`,
            icon:
              level === 1
                ? ''
                : level === 16
                  ? 'https://camp.test/broken.png'
                  : 'https://camp.test/item.svg',
            description: '合成测试装备',
            category: 'equipment',
            equipSlot: slots[index]!,
            rarity: 2,
            baseAttack: 8,
            baseDefense: 4,
            purchasePoint: 20,
          },
        }));
        state.pet.equippedItems = Object.fromEntries(
          items.map((item, index) => [slots[index]!, item]),
        );
        await page.route('https://camp.test/broken.png', (route) => route.fulfill({ status: 404 }));
        state.hold = true;
        await page.reload();
        await expect(page.getByText('正在整理营地资料…', { exact: true })).toBeVisible();
        await assertPetLayout(page);
        state.hold = false;
        state.release();
        const openCare = page.getByRole('button', { name: /^伙伴档案/ });
        await expect(openCare).toBeEnabled();
        if (width <= 760) await openCare.tap();
        else await openCare.click();
        const care = page.getByRole('dialog', { name: '伙伴档案', exact: true });
        for (const level of levels)
          await expect(
            care.getByRole('img', { name: `强化等级 +${level}`, exact: true }),
          ).toHaveCount(1);
        await expect(
          care.getByRole('img', { name: '测试装备1：暂无图片', exact: true }),
        ).toBeVisible();
        await expect(
          care.getByRole('img', { name: '测试装备16：图片加载失败', exact: true }),
        ).toBeVisible();
        const icons = care.locator('[data-enhance-tier]');
        expect(
          await icons.evaluateAll((nodes) =>
            nodes.map((node) => node.getAttribute('data-enhance-tier')),
          ),
        ).toEqual(['1', '2', '3', '4', '5', '5']);
        const boxes = await icons.evaluateAll((nodes) =>
          nodes.map((node) => {
            const badge = node.querySelector('[aria-label^="强化等级"]')!.getBoundingClientRect();
            const heading = node.parentElement!;
            const card = heading.parentElement!.getBoundingClientRect();
            const text = heading.lastElementChild!.getBoundingClientRect();
            return {
              inside: badge.top >= card.top + 4 && badge.right <= card.right - 4,
              textGap: text.left - badge.right,
            };
          }),
        );
        for (const box of boxes) {
          expect(box.inside).toBe(true);
          expect(box.textGap).toBeGreaterThanOrEqual(4);
        }
        await assertPetLayout(page);
        const rainbow = care.locator('[data-enhance-tier="5"]').last();
        await expect(rainbow).not.toHaveCSS('animation-name', 'none');
        const requests = state.mineRequests;
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect(rainbow).toHaveCSS('animation-name', 'none');
        expect(
          await rainbow.evaluate((node) => getComputedStyle(node, '::before').animationName),
        ).toBe('none');
        expect(state.mineRequests).toBe(requests);
        const viewport = care.getByRole('region', { name: '伙伴档案内容', exact: true });
        await viewport.evaluate((node) => {
          node.scrollTop = node.scrollHeight;
        });
        await assertPetLayout(page);
        await page.screenshot({ path: info.outputPath('equipment.png') });
        await care.getByRole('button', { name: '关闭面板', exact: true }).click();

        let phase = 'ready';
        await page.route('**/api/itemInstances/my/list/page/vo', (route) =>
          route.fulfill({
            json:
              phase === 'error'
                ? { code: 40000, message: '行囊读取失败，请重试' }
                : {
                    code: 0,
                    data: {
                      total: phase === 'empty' ? 0 : 7,
                      records:
                        phase === 'empty'
                          ? []
                          : [...items, { ...items[0], id: '700', enhanceLevel: 0 }],
                    },
                  },
          }),
        );
        await page.getByRole('button', { name: /^行囊/ }).click();
        const bag = page.getByRole('dialog', { name: '行囊', exact: true });
        await expect(bag.getByRole('img', { name: '强化等级 +16', exact: true })).toHaveCount(2);
        await expect(bag.getByRole('img', { name: '强化等级 +0', exact: true })).toHaveCount(0);
        await assertPetLayout(page);
        const worn = bag.getByRole('heading', { name: /^已穿戴/ }).locator('..');
        const hand = worn
          .getByRole('img', { name: '强化等级 +16', exact: true })
          .locator('..')
          .locator('..')
          .locator('..');
        await hand.getByRole('button', { name: '卸下', exact: true }).click();
        await expect(worn.getByRole('img', { name: '强化等级 +16', exact: true })).toHaveCount(0);
        expect(state.actions).toContain('unequip');
        await bag.getByRole('button', { name: '关闭面板', exact: true }).click();
        phase = 'error';
        await page.getByRole('button', { name: /^行囊/ }).click();
        await expect(bag.getByRole('alert')).toContainText('读取失败');
        await expect(bag.getByRole('img', { name: '强化等级 +15', exact: true })).toBeVisible();
        phase = 'empty';
        await bag.getByRole('button', { name: '重试', exact: true }).click();
        await expect(bag.getByRole('heading', { name: '行囊还是空的' })).toBeVisible();
        await assertPetLayout(page);
        await bag.getByRole('button', { name: '关闭面板', exact: true }).click();
        await page.getByRole('button', { name: /^挑战/ }).click();
        const challenge = page.getByRole('dialog', { name: '挑战', exact: true });
        await challenge.getByRole('button', { name: '资料', exact: true }).click();
        const other = page.getByRole('dialog', { name: '伙伴资料', exact: true });
        await expect(other.getByRole('img', { name: '强化等级 +15', exact: true })).toBeVisible();
        await assertPetLayout(page);
        await other.getByRole('button', { name: '关闭面板', exact: true }).click();
        await challenge.getByRole('button', { name: '关闭面板', exact: true }).click();
      });
    }
