import { expect, test } from '@playwright/test';
import { setupPet } from './pet-fixture';

for (const mode of ['light', 'dark'])
  for (const width of [1440, 375, 390]) {
    test(`pixel-island ${mode} ${width}: food dropdown paginates, filters and merges stock`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
      const state = await setupPet(page, 'pixel-island', mode);
      let release = () => {};
      let failMore = true;
      const requests: number[] = [];
      await page.route('**/api/itemInstances/my/list/page/vo', async (route) => {
        const body = route.request().postDataJSON() as { category?: string; current: number };
        if (body.category !== 'consumable') return route.fallback();
        requests.push(body.current);
        if (body.current === 1)
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        if (body.current === 3 && failMore) return route.fulfill({ status: 503, json: {} });
        await route.fulfill({
          json: {
            code: 0,
            data: {
              total: 36,
              records: Array.from({ length: 12 }, (_, i) => {
                const n = (body.current - 1) * 12 + i;
                return {
                  id: String(701 + n),
                  quantity: n === 3 ? 0 : n + 1,
                  template: {
                    id: String(80 + n),
                    code: n === 4 ? '' : `food_${n === 1 ? 0 : n}`,
                    name: `鱼饼 ${n === 1 ? 0 : n}`,
                    category: 'consumable',
                    subType: n === 2 ? 'material' : 'food',
                  },
                };
              }),
            },
          },
        });
      });
      await page.getByRole('button', { name: '设置自动喂食', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: '自动喂食', exact: true });
      await expect(dialog.getByText('正在读取背包食物…', { exact: true })).toBeVisible();
      await expect.poll(() => requests).toEqual([1]);
      release();
      await dialog.getByRole('combobox', { name: '选择食物', exact: true }).click();
      const list = page.getByRole('listbox', { name: '选择食物', exact: true });
      const viewport = list.locator('[data-scroll-viewport]');
      await expect(list.getByRole('option', { name: '鱼饼 0 ×3', exact: true })).toBeVisible();
      await expect(list.getByRole('option', { name: /^鱼饼 [234] ×/ })).toHaveCount(0);
      await viewport.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await expect.poll(() => requests.includes(2)).toBe(true);
      await expect(list.getByRole('option', { name: '鱼饼 23 ×24', exact: true })).toBeAttached();
      await viewport.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await expect(list.getByRole('button', { name: '重试食物', exact: true })).toBeVisible();
      expect(requests).toEqual([1, 2, 3]);
      failMore = false;
      await list.getByRole('button', { name: '重试食物', exact: true }).click();
      const last = list.getByRole('option', { name: '鱼饼 35 ×36', exact: true });
      await expect(last).toBeAttached();
      await last.scrollIntoViewIfNeeded();
      if (width <= 760) await last.tap();
      else await last.click();
      await expect(dialog.getByRole('combobox', { name: '选择食物', exact: true })).toContainText(
        '鱼饼 35 ×36',
      );
      await dialog.getByRole('button', { name: '保存设置', exact: true }).click();
      await expect.poll(() => state.auto?.foodCode).toBe('food_35');
      expect(requests).toEqual([1, 2, 3, 3]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
