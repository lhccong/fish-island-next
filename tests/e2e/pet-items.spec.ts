import { expect, test } from '@playwright/test';
import { setupPet } from './pet-fixture';

test('item images, decimal fields and failure placeholders remain usable', async ({ page }) => {
  await setupPet(page, 'wechat', 'light');
  await page.route('**/api/itemInstances/my/list/page/vo', (route) =>
    route.fulfill({
      json: {
        code: 0,
        data: {
          total: 1,
          records: [
            {
              id: '501',
              quantity: '1',
              enhanceLevel: '3',
              template: {
                id: '40',
                name: '测试护腕',
                icon: 'https://camp.test/missing.png',
                rarity: '2',
                purchasePoint: '20.5',
                baseDefense: '4',
                equipSlot: 'hand',
              },
            },
          ],
        },
      },
    }),
  );
  await page.route('https://camp.test/missing.png', (route) => route.fulfill({ status: 404 }));
  await page.getByRole('button', { name: /^行囊/ }).click();
  const bag = page.getByRole('dialog', { name: '行囊', exact: true });
  await expect(bag.getByText('测试护腕', { exact: true })).toBeVisible();
  await expect(bag.getByText(/强化 \+3/)).toBeVisible();
  await expect(bag.getByRole('img', { name: '测试护腕：图片加载失败', exact: true })).toBeVisible();
  await expect(bag.getByText('防御', { exact: true })).toBeVisible();
  await expect(bag.getByRole('button', { name: '穿戴', exact: true })).toBeEnabled();
});
