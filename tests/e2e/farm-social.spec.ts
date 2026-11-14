import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { farmFixture } from './farm-fixture';
test('全部主题模式视口的旧版好友结构、头像、搜索排序及滚动', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  await farmFixture(page);
  let calls = 0;
  const friends = Array.from({ length: 28 }, (_, i) => ({
    friendId: String(456 + i),
    nickname: i === 0 ? '合成好友甲' : `合成好友${i}`,
    level: 50 - i,
    canSteal: i % 2 === 0,
    avatar:
      i === 0 ? 'https://farm.test/avatar.svg' : i === 1 ? 'https://farm.test/broken.png' : '',
  }));
  await page.route('https://farm.test/avatar.svg', (r) =>
    r.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44"><rect width="44" height="44" fill="#86b798"/><circle cx="22" cy="22" r="14" fill="#faf0ce"/></svg>',
    }),
  );
  await page.route('https://farm.test/broken.png', (r) => r.fulfill({ status: 404, body: '' }));
  await page.route('**/api/farm/friend/list', (r) => {
    calls++;
    return r.fulfill({ json: { code: 0, data: friends } });
  });
  await page.goto('/game/farm');
  await expect(page.getByRole('button', { name: /^1号地/ })).toBeVisible({ timeout: 30000 });
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
        await page.getByRole('button', { name: '好友', exact: true }).click();
        const dialog = page.getByRole('dialog');
        const region = dialog.getByRole('region', { name: '农场列表' });
        const rows = region.locator('li');
        await expect(rows).toHaveCount(28);
        const portrait = dialog.getByRole('img', { name: '合成好友甲的头像', exact: true });
        await expect
          .poll(() => portrait.locator('img').evaluate((e: HTMLImageElement) => e.naturalWidth))
          .toBeGreaterThan(0);
        await expect(dialog.getByRole('img', { name: '合成岛友的头像' })).toBeVisible();
        await expect(dialog.getByRole('img', { name: '合成好友1的头像' })).toHaveText('合');
        if (skin.id === 'wechat')
          await page.screenshot({ path: testInfo.outputPath(`friends-full-${mode}-${width}.png`) });
        const sort = dialog.getByRole('combobox', { name: '好友等级排序' });
        await sort.click();
        await page.getByRole('option', { name: '等级从低到高' }).click();
        await expect(rows.first()).toContainText('合成好友27');
        const search = dialog.getByRole('searchbox', { name: '搜索好友昵称' });
        await search.fill('甲');
        await expect(rows).toHaveCount(1);
        await expect(rows).toContainText('可偷');
        const count = calls;
        await page.evaluate(async () => {
          const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
          const store = useAppearanceStore.getState();
          store.setColorMode(store.colorMode === 'light' ? 'dark' : 'light');
          store.setColorMode(store.colorMode);
        });
        await expect(search).toHaveValue('甲');
        expect(calls).toBe(count);
        if (skin.id === 'wechat')
          await page.screenshot({ path: testInfo.outputPath(`friends-${mode}-${width}.png`) });
        await search.fill('不存在');
        await expect(dialog.getByText('没有匹配的好友')).toBeVisible();
        await search.fill('');
        await rows.last().scrollIntoViewIfNeeded();
        expect(await region.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
        const gap = await rows
          .last()
          .evaluate(
            (e) =>
              e.closest('[data-radix-scroll-area-viewport]')!.getBoundingClientRect().right -
              e.getBoundingClientRect().right,
          );
        expect(gap).toBeGreaterThanOrEqual(width <= 760 ? 20 : 24);
        await rows.first().scrollIntoViewIfNeeded();
        await region.hover();
        expect(await region.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
        await dialog.getByRole('button', { name: '访客', exact: true }).click();
        await expect(dialog.getByText('收走 萝卜 · 2 积分')).toBeVisible();
        await dialog.getByRole('button', { name: '同玩好友' }).click();
        await expect(dialog.getByRole('combobox')).toBeVisible();
        await dialog.getByRole('searchbox').fill('甲');
        await dialog.getByRole('button', { name: '拜访', exact: true }).click();
        await expect(page.getByRole('heading', { name: '合成好友甲的农场' })).toBeVisible();
        await expect(page.getByRole('img', { name: '合成好友甲的头像' })).toBeVisible();
        await page.getByRole('button', { name: '回家', exact: true }).click();
        await expect(page.getByRole('button', { name: /^1号地/ })).toBeEnabled();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
});
test('浮动提示不占位、自动消失，重复操作重新提示', async ({ page }) => {
  const state = await farmFixture(page);
  await page.goto('/game/farm');
  const land = page.getByRole('button', { name: /^1号地/ });
  await expect(land).toBeEnabled();
  const scene = page.getByRole('region', { name: '农场田地' });
  await scene.scrollIntoViewIfNeeded();
  const initial = (await scene.boundingBox())!.y;
  await land.click();
  const notice = page.getByRole('status').filter({ hasText: '收获成功' });
  await expect(notice).toBeVisible();
  expect((await scene.boundingBox())!.y).toBe(initial);
  expect(await notice.evaluate((e) => getComputedStyle(e.parentElement!).position)).toBe('fixed');
  await expect(notice).toHaveCount(0, { timeout: 6500 });
  state.lands[0]!.status = 2;
  await page.getByRole('button', { name: '刷新', exact: true }).click();
  await expect(land).toBeEnabled();
  await land.click();
  await expect(notice).toBeVisible();
});
