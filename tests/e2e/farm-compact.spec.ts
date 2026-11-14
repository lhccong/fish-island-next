import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { farmFixture, makeLands } from './farm-fixture';
test('全部主题双模式紧凑页头、场景与点击直接收获', async ({ browser }, testInfo) => {
  test.setTimeout(180000);
  for (const width of [1440, 375, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: width <= 760,
      isMobile: width <= 760,
    });
    try {
      const page = await context.newPage();
      const state = await farmFixture(page);
      const owner = '合成农夫（用于检查较长名称的显示）';
      await page.route('**/api/farm/user/info', (r) =>
        r.fulfill({
          json: {
            code: 0,
            data: { userName: owner, level: 47, experience: 23496, totalHarvest: 446 },
          },
        }),
      );
      let held = false;
      let posts = 0;
      await page.route('**/api/land/harvest', async (r) => {
        posts++;
        while (held && !page.isClosed()) await new Promise((resolve) => setTimeout(resolve, 30));
        await r.fallback();
      });
      await page.goto('/game/farm');
      for (const skin of builtinSkins)
        for (const mode of ['light', 'dark']) {
          await page.evaluate(
            async ({ skin, mode }) => {
              const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
              useAppearanceStore.getState().setSkinId(skin as never);
              useAppearanceStore.getState().setColorMode(mode as never);
            },
            { skin: skin.id, mode },
          );
          await expect(page.getByRole('button', { name: /^1号地/ })).toBeVisible({
            timeout: 30000,
          });
          const heading = page.getByRole('heading', { name: `${owner}的小小农场` });
          const header = heading.locator('..');
          expect((await header.boundingBox())!.height).toBeLessThanOrEqual(width <= 760 ? 110 : 52);
          expect(await header.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
          const scene = page.getByRole('region', { name: '农场田地' });
          expect((await scene.boundingBox())!.width).toBeLessThanOrEqual(
            width <= 760 ? width : 976,
          );
          expect(
            (await scene.getByRole('button').first().boundingBox())!.height,
          ).toBeLessThanOrEqual(98);
          const refresh = page.getByRole('button', { name: '刷新', exact: true });
          expect((await refresh.boundingBox())!.height).toBe(width <= 760 ? 44 : 32);
          if (skin.id === 'wechat') {
            await heading.scrollIntoViewIfNeeded();
            await page.screenshot({ path: testInfo.outputPath(`compact-${mode}-${width}.png`) });
          }
          state.failAction = true;
          held = true;
          const count = posts;
          const land = page.getByRole('button', { name: /^1号地/ });
          if (width <= 760) await land.tap();
          else await land.click();
          await expect(page.getByText('正在处理…', { exact: true })).toBeVisible();
          await expect(land).toBeDisabled();
          await land.evaluate((e: HTMLButtonElement) => e.click());
          expect(posts).toBe(count + 1);
          await expect(page.getByRole('dialog')).toHaveCount(0);
          held = false;
          await expect(page.getByText('积分不足，请补充积分后重试')).toBeVisible();
          await expect(land).toBeEnabled();
          state.failAction = false;
          const success = page.getByText('收获成功', { exact: true }).waitFor({ state: 'visible' });
          await land.focus();
          await land.press('Enter');
          await success;
          await expect(page.getByRole('button', { name: /^1号地.*待播种/ })).toBeEnabled();
          await expect(page.getByRole('dialog')).toHaveCount(0);
          expect(state.actions.at(-1)?.body).toEqual({ landIds: ['1'] });
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
          state.lands = makeLands();
          await refresh.click();
          await expect(page.getByRole('button', { name: /^1号地.*可收获/ })).toBeEnabled();
        }
    } finally {
      await context.close();
    }
  }
});
