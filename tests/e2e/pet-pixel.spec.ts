import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';
import { assertPetLayout } from './pet-layout';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: inline inventory, scroll, selection and appearance`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
        const state = await setupPet(page, skin.id, mode);
        await expect(
          page
            .getByRole('complementary', { name: '营地行囊', exact: true })
            .getByRole('heading', { name: /^行囊/ }),
        ).toBeVisible();
        state.pet.petUrl = 'https://camp.test/wutiaowu.webp';
        await page.route(state.pet.petUrl, (route) =>
          route.fulfill({
            contentType: 'image/webp',
            body: readFileSync(new URL('../fixtures/pet/wutiaowu.webp', import.meta.url)),
          }),
        );
        const requests: number[] = [];
        let failMore = true;
        let bagState: 'ready' | 'empty' | 'error' | 'loading' = 'ready';
        let release = () => {};
        let loadingRequested = false;
        await page.route('**/api/itemInstances/my/list/page/vo', async (route) => {
          const current = (route.request().postDataJSON() as { current: number }).current;
          requests.push(current);
          if (bagState === 'loading') {
            loadingRequested = true;
            await new Promise<void>((resolve) => {
              release = resolve;
            });
          }
          if (bagState === 'error' || (current === 3 && failMore))
            return route.fulfill({ status: 503, json: {} });
          await route.fulfill({
            json: {
              code: 0,
              data: {
                total: bagState === 'empty' ? 0 : 36,
                records:
                  bagState === 'empty'
                    ? []
                    : Array.from({ length: 12 }, (_, i) => {
                        const n = (current - 1) * 12 + i;
                        return {
                          id: String(501 + n),
                          quantity: n + 1,
                          enhanceLevel: n % 5,
                          template: {
                            id: String(40 + n),
                            name: `营地装备 ${n + 1}`,
                            icon: 'https://camp.test/item.svg',
                            category: 'equipment',
                            equipSlot: 'hand',
                            rarity: (n % 4) + 1,
                            baseAttack: 8,
                            baseDefense: 4,
                          },
                        };
                      }),
              },
            },
          });
        });
        await page.reload();
        const bag = page.getByRole('complementary', { name: '营地行囊', exact: true });
        const viewport = bag.getByRole('region', { name: '行囊物品网格', exact: true });
        const cells = viewport.getByRole('button', { name: /^营地装备/ });
        await expect(cells.first()).toBeVisible();
        await expect.poll(() => requests.includes(2)).toBe(true);
        await viewport.scrollIntoViewIfNeeded();
        // Exercise actual wheel/touch scrolling, including the reserved hidden mobile gutter.
        if (width > 760) {
          await viewport.hover();
          await page.mouse.wheel(0, 800);
        } else {
          const bounds = (await viewport.boundingBox())!;
          const cdp = await page.context().newCDPSession(page);
          const x = bounds.x + bounds.width / 2;
          const y = bounds.y + bounds.height - 25;
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y }],
          });
          for (let step = 1; step <= 6; step++)
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x, y: y - step * 30 }],
            });
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await cdp.detach();
        }
        await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
        await viewport.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        await expect(bag.getByRole('alert')).toBeVisible();
        await expect(cells).toHaveCount(24);
        expect(requests.filter((p) => p === 3)).toHaveLength(1);
        failMore = false;
        await bag.getByRole('button', { name: '重试物品', exact: true }).click();
        await expect(cells).toHaveCount(36);
        await expect(bag.getByText('已全部加载', { exact: true })).toBeVisible();
        expect(requests).toEqual([1, 2, 3, 3]);
        await assertPetLayout(page);
        const spacing = await viewport.evaluate((el) => ({
          gutter: parseFloat(getComputedStyle(el).paddingRight),
          overflow: el.scrollWidth - el.clientWidth,
        }));
        expect(spacing.gutter).toBeGreaterThanOrEqual(width > 760 ? 24 : 20);
        expect(spacing.overflow).toBeLessThanOrEqual(1);
        const track = viewport.locator('..').locator('[data-orientation="vertical"]');
        if (width > 760) {
          await viewport.hover();
          await expect(track).toHaveCSS('opacity', '1');
        } else await expect(track).toHaveCSS('visibility', 'hidden');
        await cells.last().click();
        await expect(bag.getByRole('region', { name: '选中物品详情' })).toContainText(
          '营地装备 36',
        );
        const requestCount = requests.length;
        const mineCount = state.mineRequests;
        if (width <= 760) await page.setViewportSize({ width: 1440, height: 1000 });
        const scrollTop = await viewport.evaluate((el) => el.scrollTop);
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
        expect(await viewport.evaluate((el) => el.scrollTop)).toBe(scrollTop);
        if (width <= 760) await page.setViewportSize({ width, height: 844 });
        await expect(cells.last()).toHaveAttribute('aria-pressed', 'true');
        expect(requests).toHaveLength(requestCount);
        expect(state.mineRequests).toBe(mineCount);
        await bag.getByRole('button', { name: '其他物品', exact: true }).click();
        await expect(
          bag.getByRole('heading', { name: '当前分类暂无物品', exact: true }),
        ).toBeVisible();
        await bag.getByRole('button', { name: '全部', exact: true }).click();
        await cells.first().click();
        await bag.getByRole('button', { name: '穿戴', exact: true }).click();
        await expect.poll(() => state.actions.includes('equip')).toBe(true);
        await expect(
          page.getByRole('button', { name: '手部：苔纹护腕', exact: true }),
        ).toBeVisible();
        await expect(bag.getByRole('button', { name: '已穿戴', exact: true })).toBeDisabled();
        await bag.getByRole('button', { name: '管理行囊', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: '行囊', exact: true });
        await expect(dialog).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
        await expect(bag.getByRole('button', { name: '管理行囊', exact: true })).toBeFocused();
        await assertPetLayout(page);
        await page.getByRole('heading', { name: '伙伴营地', exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath('workspace.png') });
        await bag.scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath('inventory.png') });
        bagState = 'loading';
        await page.reload();
        await expect(bag.getByText('正在整理营地资料…', { exact: true })).toBeVisible();
        await expect.poll(() => loadingRequested).toBe(true);
        bagState = 'error';
        release();
        await expect(bag.getByRole('alert')).toBeVisible();
        await assertPetLayout(page);
        bagState = 'empty';
        await bag.getByRole('button', { name: '重试', exact: true }).click();
        await expect(bag.getByRole('heading', { name: '行囊还是空的', exact: true })).toBeVisible();
        await assertPetLayout(page);
      });
    }
