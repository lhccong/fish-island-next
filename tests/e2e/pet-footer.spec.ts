import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';

test.setTimeout(90_000);

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: pet footer stays inside the camp scroll area`, async ({
      page,
    }, info) => {
      if (page.viewportSize()!.width > 760)
        await page.setViewportSize({ width: 1440, height: 1000 });
      const state = await setupPet(page, skin.id, mode);
      const mobile = page.viewportSize()!.width <= 760;
      const scroll = page.getByRole('region', { name: '主内容滚动区', exact: true });
      for (const phase of ['success', 'loading', 'empty', 'error']) {
        if (phase === 'loading') {
          state.hold = true;
          await page.reload();
          await expect(page.getByText('正在整理营地资料…', { exact: true })).toBeVisible();
        } else if (phase !== 'success') {
          state.empty = true;
          state.fail = phase === 'error';
          await page.reload();
        }
        if (phase === 'success')
          await expect(page.getByRole('heading', { name: /小苔/ })).toBeVisible();
        if (phase === 'empty')
          await expect(
            page.getByRole('heading', { name: '营地正等着第一位伙伴', exact: true }),
          ).toBeVisible();
        if (phase === 'error') await expect(page.getByRole('alert')).toContainText('合成读取失败');
        const footer = page.locator('footer[aria-label="网站备案与版权"]:visible');
        if (mobile) {
          await expect(footer).toHaveCount(0);
          await scroll.focus();
          await scroll.press('End');
        } else {
          await expect(footer).toHaveCount(1);
          const camp = page.getByRole('region', { name: '伙伴营地', exact: true });
          await expect(camp.locator('footer[aria-label="网站备案与版权"]')).toHaveCount(1);
          await scroll.focus();
          await scroll.press('End');
          await expect(footer).toBeInViewport();
          const bounds = await footer.boundingBox();
          const viewport = await scroll.boundingBox();
          const campBounds = await camp.boundingBox();
          expect(bounds!.y + bounds!.height).toBeCloseTo(campBounds!.y + campBounds!.height, 0);
          expect(bounds!.y).toBeGreaterThanOrEqual(viewport!.y);
          expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
            viewport!.y + viewport!.height + 1,
          );
          await expect(footer).toHaveCSS('position', 'static');
          await expect(footer).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
          await footer.getByRole('link').focus();
          await expect(footer.getByRole('link')).toBeFocused();
        }
        expect(await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        if (phase === 'success') await page.screenshot({ path: info.outputPath('pet-footer.png') });
        if (phase === 'success') {
          const feed = page.getByRole('button', { name: '喂食 · 5 积分', exact: true });
          if (mobile) await feed.tap();
          else await feed.click();
          await expect(page.getByRole('meter', { name: '饱食', exact: true })).toHaveAttribute(
            'value',
            '90',
          );
        }
        if (phase === 'loading') {
          state.hold = false;
          state.release();
          await expect(page.getByRole('heading', { name: /小苔/ })).toBeVisible();
        }
      }
    });
  }
