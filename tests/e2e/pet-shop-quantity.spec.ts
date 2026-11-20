import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';
import { assertPetLayout } from './pet-layout';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: enters and confirms a supply quantity`, async ({
        page,
      }, info) => {
        const mobile = width <= 760;
        const tap = (locator: Locator) => (mobile ? locator.tap() : locator.click());
        await page.setViewportSize({ width, height: mobile ? 844 : 1000 });
        const camp = await setupPet(page, skin.id, mode);
        const goods = Array.from({ length: 12 }, (_, index) => ({
          id: String(80 + index),
          name: index === 0 ? '普通鱼饼' : `营地物品 ${index + 1}`,
          stackable: index === 1 ? 0 : 1,
          purchasePoint: 8,
          baseAttack: 0,
          baseDefense: 0,
          baseHp: 0,
        }));
        let listState = 'loading';
        let requests = 0;
        let releaseList = () => {};
        await page.route('**/itemTemplates/list/page/purchasable', async (route) => {
          requests += 1;
          if (listState === 'loading')
            await new Promise<void>((resolve) => (releaseList = resolve));
          const records = listState === 'ready' ? goods : [];
          return route.fulfill({
            json:
              listState === 'error'
                ? { code: 40000, message: '补给铺暂时无法读取' }
                : { code: 0, data: { records, total: records.length } },
          });
        });
        const orders: (string | null)[] = [];
        let releaseOrder = () => {};
        await page.route('**/itemTemplates/purchase?*', async (route) => {
          const request = route.request();
          const params = new URL(request.url()).searchParams;
          expect(request.method()).toBe('POST');
          expect(params.get('templateId')).toBe('80');
          orders.push(params.get('quantity'));
          const fail = orders.length === 1;
          if (fail) await new Promise<void>((resolve) => (releaseOrder = resolve));
          return route.fulfill({
            json: fail ? { code: 40000, message: '积分不足' } : { code: 0, data: true },
          });
        });

        const entry = page.getByRole('button', { name: '补给铺', exact: true });
        await tap(entry);
        const shop = page.getByRole('dialog', { name: '补给铺', exact: true });
        const close = shop.getByRole('button', { name: '关闭面板' });
        await expect(shop.locator('[data-loading-indicator="region"]')).toContainText(
          '正在整理营地资料',
        );
        await expect.poll(() => requests).toBe(1);
        await assertPetLayout(page);
        listState = 'error';
        releaseList();
        await expect(shop.getByRole('alert')).toContainText('补给铺暂时无法读取');
        await assertPetLayout(page);
        listState = 'empty';
        await tap(shop.getByRole('button', { name: '重试' }));
        await expect(shop.getByRole('heading', { name: '暂无物品' })).toBeVisible();
        await assertPetLayout(page);
        await tap(close);

        listState = 'ready';
        await tap(entry);
        const region = shop.getByRole('region', { name: '补给铺内容' });
        const food = shop.getByRole('article').filter({ hasText: '普通鱼饼' });
        const field = food.getByRole('textbox', { name: '数量' });
        const buy = food.getByRole('button', { name: /^购买/ });
        await expect(field).toHaveValue('1');
        await expect(shop.getByRole('article').nth(1).getByRole('textbox')).toHaveCount(0);
        await expect(field).toHaveAttribute('inputmode', 'numeric');
        await expect(buy).toHaveText('购买 · 8 积分');
        expect((await field.boundingBox())!.height).toBeGreaterThanOrEqual(mobile ? 44 : 32);
        expect((await buy.boundingBox())!.height).toBeGreaterThanOrEqual(mobile ? 44 : 32);
        await tap(field);
        await expect(field).toBeFocused();
        for (const invalid of ['', '0', '-2', '1.5', '2e3', '9999999999']) {
          await field.fill(invalid);
          await expect(field).toHaveAttribute('aria-invalid', 'true');
          await expect(buy).toBeDisabled();
        }
        await field.fill('3');
        await expect(field).toHaveAttribute('aria-invalid', 'false');
        await expect(buy).toHaveText('购买 · 24 积分');
        if (!mobile) await buy.hover();
        const confirm = page.getByRole('dialog', { name: '购买 · 24 积分', exact: true });
        await tap(buy);
        await expect(confirm).toContainText('消耗 24 积分购买 3 件「普通鱼饼」');
        await assertPetLayout(page);
        await page.keyboard.press('Escape');
        await expect(buy).toBeFocused();
        await expect(field).toHaveValue('3');
        expect(orders).toEqual([]);

        await tap(buy);
        const submit = confirm.getByRole('button', { name: '确认', exact: true });
        await tap(submit);
        try {
          await expect.poll(() => orders).toEqual(['3']);
          await expect(confirm.getByRole('button').filter({ hasText: '处理中…' })).toBeDisabled();
          await expect(confirm.getByRole('status')).toContainText('处理中…');
        } finally {
          releaseOrder();
        }
        await expect(confirm.getByRole('alert')).toHaveText('积分不足');
        await tap(submit);
        await expect(confirm).toHaveCount(0);
        await expect(food.getByRole('status')).toHaveText('已购买 3 件「普通鱼饼」');
        await expect(field).toHaveValue('1');
        await expect(buy).toBeFocused();
        expect(orders).toEqual(['3', '3']);
        expect(requests).toBe(3);
        await expect.poll(() => camp.mineRequests).toBeGreaterThan(1);
        await assertPetLayout(page);

        const rail = shop.locator('[data-orientation="vertical"][data-state]');
        if (mobile) {
          await expect(rail.first()).toBeHidden();
          const area = (await region.boundingBox())!;
          const session = await page.context().newCDPSession(page);
          const x = area.x + area.width / 2;
          const y = area.y + area.height - 24;
          await session.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y }],
          });
          for (let offset = 30; offset <= 180; offset += 30)
            await session.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x, y: y - offset }],
            });
          await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
          await session.detach();
        } else {
          await region.hover();
          await expect(rail.first()).toBeVisible();
          await page.mouse.wheel(0, 320);
        }
        await expect.poll(() => region.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
        const lastField = shop.getByRole('textbox', { name: '数量' }).last();
        await lastField.scrollIntoViewIfNeeded();
        await expect(lastField).toBeInViewport();
        await lastField.focus();
        await expect(lastField).toBeFocused();
        await lastField.fill('4');
        await expect(shop.getByRole('article').last().getByRole('button')).toHaveText(
          '购买 · 32 积分',
        );
        if (mobile) {
          await page.evaluate(() => {
            Object.defineProperties(visualViewport!, {
              height: { configurable: true, value: 360 },
              offsetTop: { configurable: true, value: 90 },
            });
            visualViewport!.dispatchEvent(new Event('resize'));
          });
          await expect.poll(async () => (await shop.boundingBox())!.y).toBeGreaterThanOrEqual(90);
          await expect
            .poll(async () => {
              const bounds = (await shop.boundingBox())!;
              return bounds.y + bounds.height;
            })
            .toBeLessThanOrEqual(450);
          await lastField.scrollIntoViewIfNeeded();
          await expect(lastField).toBeInViewport();
        }
        if (skin.id === 'pixel-island' && width !== 390)
          await page.screenshot({ path: info.outputPath('quantity.png') });
        await assertPetLayout(page);
        await tap(close);
        await expect(shop).toHaveCount(0);
        await expect(entry).toBeFocused();
      });
    }
