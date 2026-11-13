import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';

test.use({ hasTouch: true });
test.setTimeout(120_000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: discovery pages keep only mobile back`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: 900 });
        const state = await setupPet(page, skin.id, mode);
        const mobile = width <= 760;
        const header = page.locator('[data-mobile-header="back-only"]');
        const check = async (back = '返回发现') => {
          await expect(header).toBeVisible();
          const link = header.getByRole('link', { name: back, exact: true });
          if (mobile) {
            await expect(header.getByRole('heading')).toHaveCount(0);
            await expect(header.getByRole('navigation')).toHaveCount(0);
            await expect(header.getByRole('link')).toHaveCount(1);
            await expect(link).toBeVisible();
            const box = (await link.boundingBox())!;
            expect(box.width).toBeGreaterThanOrEqual(44);
            expect(box.height).toBeGreaterThanOrEqual(44);
            expect((await header.boundingBox())!.height).toBeLessThanOrEqual(56);
            await link.focus();
            await expect(link).toBeFocused();
            await expect(page.getByRole('navigation', { name: '发现菜单' })).toHaveCount(0);
          } else {
            await expect(header.getByRole('heading')).toBeVisible();
            await expect(page.getByRole('navigation', { name: '发现菜单' })).toBeVisible();
          }
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
        };
        await check();
        await page.screenshot({ path: info.outputPath('pet-back.png') });
        if (mobile) {
          await header.getByRole('link', { name: '返回发现' }).tap();
          await expect(page).toHaveURL('/discover');
          await page
            .getByRole('navigation', { name: '发现菜单' })
            .getByRole('link', { name: '伙伴' })
            .tap();
          await check();
        }
        for (const phase of ['loading', 'empty', 'error', 'success']) {
          state.hold = phase === 'loading';
          state.empty = phase === 'empty';
          state.fail = phase === 'error';
          await page.goto('/pet');
          if (phase === 'loading') await expect(page.getByText('正在整理营地资料…')).toBeVisible();
          if (phase === 'error') await expect(page.getByRole('alert')).toBeVisible();
          if (phase === 'success')
            await expect(page.getByRole('heading', { name: /小苔/ })).toBeVisible();
          await check();
          state.hold = false;
          state.release();
        }
        for (const path of [
          '/discover/games',
          '/game/life',
          '/reader',
          '/rank/reward',
          '/rank/welfare',
          '/rank/about',
          '/rank/other',
        ]) {
          await page.goto(path);
          const back = path === '/game/life' ? '返回游戏' : '返回发现';
          await check(back);
          if (path.startsWith('/rank/'))
            await expect(page.getByRole('navigation', { name: '关于模块' })).toBeVisible();
          if (mobile) {
            await header.getByRole('link', { name: back, exact: true }).tap();
            await expect(page).toHaveURL(path === '/game/life' ? '/discover/games' : '/discover');
          }
        }
        await page.goto('/discover/games');
        await page.getByRole('button', { name: '打开人生重开模拟器' }).click();
        await expect(page).toHaveURL('/game/life');
        await check('返回游戏');
        await page.screenshot({ path: info.outputPath('life-back.png') });
      });
    }
