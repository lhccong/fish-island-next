import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { farmFixture } from './farm-fixture';
test('连续田垄场景在全部主题模式和视口的布局与可读性', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  const state = await farmFixture(page);
  state.lands = state.lands.map((l, i) =>
    i < 11 ? { ...l, locked: 0, status: 2, cropName: '小萝卜', plantedCropId: '1' } : l,
  );
  await page.goto('/game/farm');
  await expect(page.getByRole('button', { name: /^1号地/ })).toBeVisible({ timeout: 30000 });
  const requests = state.calls;
  for (const skin of builtinSkins)
    for (const mode of ['light', 'dark'])
      for (const width of [1440, 375, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(
          async ({ skin, mode }) => {
            const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
            useAppearanceStore.getState().setSkinId(skin as never);
            useAppearanceStore.getState().setColorMode(mode as never);
          },
          { skin: skin.id, mode },
        );
        const scene = page.getByRole('region', { name: '农场田地' });
        const first = scene.getByRole('button').first();
        await first.scrollIntoViewIfNeeded();
        const metrics = await scene.evaluate((e) => {
          const box = e.getBoundingClientRect();
          const buttons = [...e.querySelectorAll('button')];
          const style = getComputedStyle(buttons[0]!);
          return {
            overflow: buttons.some((b) => {
              const r = b.getBoundingClientRect();
              return r.left < box.left || r.right > box.right;
            }),
            background: style.backgroundColor,
            border: style.borderTopWidth,
            hit: Math.min(...buttons.map((b) => b.getBoundingClientRect().height)),
          };
        });
        expect(metrics.overflow).toBe(false);
        expect(metrics.background).toBe('rgba(0, 0, 0, 0)');
        expect(metrics.border).toBe('0px');
        expect(metrics.hit).toBeGreaterThanOrEqual(44);
        const detail = scene.getByRole('button').last();
        await detail.focus();
        await detail.press('Enter');
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(detail).toBeFocused();
        await scene.getByRole('button').last().scrollIntoViewIfNeeded();
        await expect(scene.getByRole('button').last()).toBeVisible();
        expect(state.calls).toBe(requests);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        if (skin.id === 'wechat') {
          await scene.scrollIntoViewIfNeeded();
          await page.screenshot({ path: testInfo.outputPath(`scene-${mode}-${width}.png`) });
        }
      }
});
test('游戏目录农场封面在全部主题明暗模式与视口可读且可进入', async ({ page }) => {
  await farmFixture(page);
  await page.goto('/discover/games');
  const card = page.getByRole('button', { name: '打开摸鱼农场', exact: true });
  for (const skin of builtinSkins)
    for (const mode of ['light', 'dark'])
      for (const width of [1440, 375, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(
          async ({ skin, mode }) => {
            const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
            useAppearanceStore.getState().setSkinId(skin as never);
            useAppearanceStore.getState().setColorMode(mode as never);
          },
          { skin: skin.id, mode },
        );
        await card.scrollIntoViewIfNeeded();
        await expect(card).toBeVisible();
        const contrast = await card
          .locator('div')
          .first()
          .evaluate((e) => {
            const style = getComputedStyle(e);
            const luminance = (raw: string) => {
              const rgb = raw
                .match(/[\d.]+/g)!
                .slice(0, 3)
                .map((n) => {
                  const s = Number(n) / 255;
                  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
                });
              return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
            };
            const a = luminance(style.color);
            const b = luminance(style.backgroundColor);
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          });
        expect(contrast).toBeGreaterThanOrEqual(4.5);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
  await card.click();
  await expect(page).toHaveURL('/game/farm');
  await expect(page.getByRole('button', { name: /^1号地/ })).toBeVisible();
});
