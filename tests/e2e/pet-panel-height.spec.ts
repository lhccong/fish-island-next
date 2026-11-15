import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';
import { assertPetLayout } from './pet-layout';

async function assertPanels(page: Page, width: number) {
  await assertPetLayout(page);
  const left = (await page.getByRole('region', { name: '伙伴与装备', exact: true }).boundingBox())!;
  const right = (await page
    .getByRole('complementary', { name: '营地行囊', exact: true })
    .boundingBox())!;
  if (width > 760) {
    expect(Math.abs(left.y - right.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(left.height - right.height)).toBeLessThanOrEqual(1);
    expect(left.height).toBeLessThan(700);
  } else expect(right.y).toBeGreaterThan(left.y + left.height);
  for (const name of ['喂食 · 5 积分', '抚摸 · 3 积分', '设置自动喂食']) {
    const bounds = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(left.y);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(left.y + left.height - 4);
    expect(bounds.height).toBeGreaterThanOrEqual(width <= 760 ? 44 : 32);
  }
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of skin.id === 'pixel-island' ? [1440, 375, 390, 1920] : [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: equal desktop panels and reachable compact attributes`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
        const state = await setupPet(page, skin.id, mode);
        Object.assign(state.pet.equipStats, {
          critResistance: 0.12,
          dodgeResistance: 0.1689,
          blockResistance: 0.1082,
          comboResistance: 0.1833,
          lifestealResistance: 0.1511,
        });
        state.pet.equipStats.critRate = 0.1492;
        if (skin.id === 'pixel-island') {
          state.pet.petUrl = 'https://camp.test/wutiaowu.webp';
          await page.route(state.pet.petUrl, (route) =>
            route.fulfill({
              contentType: 'image/webp',
              body: readFileSync(new URL('../fixtures/pet/wutiaowu.webp', import.meta.url)),
            }),
          );
        }
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: /小苔/ })).toBeVisible();
        const bag = page.getByRole('complementary', { name: '营地行囊', exact: true });
        await expect(bag.getByRole('heading', { name: /^行囊/ })).toBeVisible();
        await assertPanels(page, width);
        const attributes = page.getByRole('region', { name: '伙伴属性', exact: true });
        await expect(attributes.locator('dt')).toHaveCount(14);
        if (width > 760)
          expect(
            await attributes.evaluate((el) => el.scrollHeight - el.clientHeight),
          ).toBeLessThanOrEqual(1);
        expect(
          await attributes.evaluate((el) => el.scrollWidth - el.clientWidth),
        ).toBeLessThanOrEqual(1);
        expect(
          parseFloat(await attributes.evaluate((el) => getComputedStyle(el).paddingRight)),
        ).toBeGreaterThanOrEqual(width <= 760 ? 20 : 24);
        if (width > 760) {
          await attributes.focus();
          await attributes.press('End');
        } else await attributes.locator('dd').last().scrollIntoViewIfNeeded();
        await expect(attributes.locator('dt').last()).toBeInViewport();
        await expect(attributes.locator('dd').last()).toBeInViewport();
        if (width > 760) await attributes.press('Home');
        else await attributes.locator('dt').first().scrollIntoViewIfNeeded();
        await expect(attributes.locator('dt').first()).toBeInViewport();
        if (width <= 760) {
          expect(
            await attributes.evaluate((el) => el.scrollHeight - el.clientHeight),
          ).toBeLessThanOrEqual(1);
          const track = attributes.locator('..').locator('[data-orientation="vertical"]');
          if (await track.count()) await expect(track).toHaveCSS('visibility', 'hidden');
        }
        const mineRequests = state.mineRequests;
        const feed = page.getByRole('button', { name: '喂食 · 5 积分', exact: true });
        if (width <= 760) await feed.tap();
        else await feed.click();
        await expect(page.getByRole('meter', { name: '饱食', exact: true })).toHaveAttribute(
          'value',
          '90',
        );
        expect(state.mineRequests).toBe(mineRequests);
        await assertPanels(page, width);
        if (skin.id === 'pixel-island') {
          const folder = resolve('docs/audits/pet-panel-height');
          mkdirSync(folder, { recursive: true });
          await page
            .getByRole('heading', { name: '伙伴营地', exact: true })
            .scrollIntoViewIfNeeded();
          await page.screenshot({ path: resolve(folder, `${mode}-${width}.png`) });
        }
        await bag.getByRole('button', { name: '其他物品', exact: true }).click();
        await expect(
          bag.getByRole('heading', { name: '当前分类暂无物品', exact: true }),
        ).toBeVisible();
        await assertPanels(page, width);
        if (width > 760) {
          await attributes.focus();
          await attributes.press('End');
          await expect(attributes.locator('dd').last()).toBeInViewport();
          await attributes.hover();
          if (await attributes.evaluate((el) => el.scrollHeight > el.clientHeight))
            await expect(
              attributes.locator('..').locator('[data-orientation="vertical"]'),
            ).toHaveCSS('opacity', '1');
        }
        state.empty = true;
        const beforeHeld = state.heldMineRequests;
        state.hold = true;
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.getByText('正在整理营地资料…', { exact: true })).toBeVisible();
        await expect.poll(() => state.heldMineRequests).toBeGreaterThan(beforeHeld);
        await assertPanels(page, width);
        state.hold = false;
        state.release();
        await expect(
          page.getByRole('heading', { name: '营地正等着第一位伙伴', exact: true }),
        ).toBeVisible();
        await assertPanels(page, width);
        state.fail = true;
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('alert')).toContainText('合成读取失败');
        await assertPanels(page, width);
      });
    }
