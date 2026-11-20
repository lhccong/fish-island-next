import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { scrollRegion } from './account-menu-layout';
import { setupPet } from './pet-fixture';
import { assertPetLayout } from './pet-layout';

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

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: equipped items and decomposition feedback`, async ({
      page,
      hasTouch,
    }, info) => {
      const state = await setupPet(page, skin.id, mode);
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
      const mobile = page.viewportSize()!.width <= 760;
      const touch = mobile && hasTouch;
      const activate = (target: Locator) => (touch ? target.tap() : target.click());
      const openBag = page.getByRole('button', { name: '行囊', exact: true });
      const bag = page.getByRole('dialog', { name: '行囊', exact: true });
      await activate(openBag);
      const cards = bag.getByRole('article');
      const equip = (index: number) =>
        cards.nth(index).getByRole('button', { name: '穿戴', exact: true });
      const decompose = (index: number) =>
        cards.nth(index).getByRole('button', { name: '分解', exact: true });
      await expect(equip(0)).toBeEnabled();
      await assertPetLayout(page);
      const bagBody = bag.getByRole('region', { name: '行囊内容' });
      const track = bagBody.locator('..').locator('[data-orientation="vertical"]');
      await scrollRegion(page, bagBody, touch);
      await expect.poll(() => bagBody.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      if (mobile) await expect(track).toHaveCSS('visibility', 'hidden');
      else await expect(track).toHaveCSS('opacity', '1');
      await decompose(11).scrollIntoViewIfNeeded();
      await expect(decompose(11)).toBeInViewport();
      await activate(equip(0));
      await expect(cards.first().getByText('已穿戴', { exact: true })).toBeVisible();
      await expect(equip(0)).toHaveCount(0);
      await expect(decompose(0)).toHaveCount(0);
      await expect(equip(1)).toBeEnabled();
      await expect(decompose(1)).toBeEnabled();
      await activate(bag.getByRole('button', { name: '卸下', exact: true }));
      await expect(equip(0)).toBeEnabled();

      let attempts = 0;
      let releaseFailure = () => {};
      const failureGate = new Promise<void>((resolve) => (releaseFailure = resolve));
      await page.route('**/api/itemInstances/decompose', async (route) => {
        expect(route.request().postDataJSON()).toEqual({ itemInstanceId: '501' });
        if (++attempts === 1) {
          await failureGate;
          return route.fulfill({ json: { code: 40000, message: '暂时无法分解，请重试' } });
        }
        state.bagEmpty = true;
        return route.fulfill({ json: { code: 0, data: '5' } });
      });

      const confirm = page.getByRole('dialog', { name: '分解', exact: true });
      const submit = confirm.getByRole('button', { name: '确认', exact: true });
      const close = confirm.getByRole('button', { name: '关闭确认', exact: true });
      const description = '分解「苔纹护腕」后无法恢复。';
      await activate(decompose(0));
      await expect(confirm).toHaveAccessibleDescription(description);
      await expect(
        confirm.getByRole('region', { name: '操作确认内容' }).getByText(description, {
          exact: true,
        }),
      ).toBeVisible();
      await assertPetLayout(page);
      const minHeight = mobile ? 44 : 32;
      expect((await submit.boundingBox())!.height).toBeGreaterThanOrEqual(minHeight);
      if (touch) {
        await activate(close);
      } else {
        await page.keyboard.press('Escape');
      }
      await expect(confirm).toHaveCount(0);
      await expect(decompose(0)).toBeFocused();
      expect(attempts).toBe(0);

      await activate(decompose(0));
      await activate(submit);
      try {
        await expect(confirm.getByRole('status')).toContainText('处理中…');
        await expect(confirm.getByRole('button', { name: '取消', exact: true })).toBeDisabled();
      } finally {
        releaseFailure();
      }
      await expect(confirm.getByRole('alert')).toHaveText('暂时无法分解，请重试');
      await expect(submit).toBeEnabled();
      await assertPetLayout(page);
      if (process.env.PET_DECOMPOSE_CAPTURE && skin.id === 'wechat')
        await page.screenshot({ path: info.outputPath('decompose-error.png') });
      await activate(close);
      await expect(decompose(0)).toBeFocused();
      await activate(decompose(0));
      await expect(confirm.getByRole('alert')).toHaveCount(0);
      await activate(submit);
      await expect(confirm).toHaveCount(0);
      await expect(bag.getByText('已分解「苔纹护腕」', { exact: true })).toBeVisible();
      await expect(bag.getByRole('heading', { name: '行囊还是空的', exact: true })).toBeVisible();
      expect(attempts).toBe(2);
    });
  }
