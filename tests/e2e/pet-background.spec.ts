import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';
import { assertPetLayout } from './pet-layout';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: island backdrop stays visible in all states`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
        const state = await setupPet(page, skin.id, mode);
        state.pet.petUrl = 'https://camp.test/wutiaowu.webp';
        state.pet.equipStats.critRate = 0.1492;
        Object.assign(state.pet.equipStats, {
          critResistance: 0.12,
          dodgeResistance: 0.1689,
          blockResistance: 0.1082,
          comboResistance: 0.1833,
          lifestealResistance: 0.1511,
        });
        await page.route(state.pet.petUrl, (route) =>
          route.fulfill({
            contentType: 'image/webp',
            body: readFileSync(new URL('../fixtures/pet/wutiaowu.webp', import.meta.url)),
          }),
        );
        await page.reload();
        const camp = page.getByRole('region', { name: '伙伴营地', exact: true });
        const heading = page.getByRole('heading', { name: /小苔/ });
        await expect(heading).toBeVisible();
        await expect(
          page
            .getByRole('complementary', { name: '营地行囊' })
            .getByRole('heading', { name: /^行囊/ }),
        ).toBeVisible();
        const styles = await camp.evaluate((el) => ({
          image: getComputedStyle(el, '::before').backgroundImage,
          opacity: getComputedStyle(el, '::before').opacity,
          events: getComputedStyle(el, '::before').pointerEvents,
          base: getComputedStyle(el).backgroundColor,
        }));
        expect(styles.image).toContain('home-island.png');
        expect(styles.opacity).toBe(mode === 'dark' ? '0.32' : '0.56');
        expect(styles.events).toBe('none');
        if (mode === 'dark') expect(styles.base).toBe('rgb(25, 26, 28)');
        else expect(styles.base).not.toMatch(/rgb\(25[0-5], 25[0-5], 25[0-5]\)/);
        expect(
          await page.evaluate(async () => {
            const image = new Image();
            image.src = '/skins/pixel-island/home-island.png';
            await image.decode();
            return image.naturalWidth;
          }),
        ).toBeGreaterThan(0);
        await assertPetLayout(page);
        const viewportHeight = await page
          .getByRole('region', { name: '主内容滚动区', exact: true })
          .evaluate((el) => el.clientHeight);
        expect((await camp.boundingBox())!.height).toBeGreaterThanOrEqual(viewportHeight);
        await page.getByRole('heading', { name: '伙伴营地', exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath('backdrop-ready.png') });
        await page.getByRole('complementary', { name: '营地行囊' }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath('backdrop-bottom.png') });
        await page.getByRole('button', { name: '喂食 · 5 积分', exact: true }).click();
        await expect(page.getByRole('meter', { name: '饱食', exact: true })).toHaveAttribute(
          'value',
          '90',
        );
        expect(await camp.evaluate((el) => getComputedStyle(el, '::before').opacity)).toBe(
          styles.opacity,
        );
        state.empty = true;
        await page.reload();
        await expect(
          page.getByRole('heading', { name: '营地正等着第一位伙伴', exact: true }),
        ).toBeVisible();
        await assertPetLayout(page);
        state.fail = true;
        await page.reload();
        await expect(page.getByRole('alert')).toContainText('合成读取失败');
        await assertPetLayout(page);
      });
    }
