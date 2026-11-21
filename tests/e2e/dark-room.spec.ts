import { expect as playwrightExpect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

const frameSelector = 'iframe[title="小黑屋模拟器"]';
const saveKey = 'fish-island:dark-room-save';
const expect = playwrightExpect.configure({ timeout: 15_000 });
test.setTimeout(60_000);

for (const width of [1440, 375, 390]) {
  const mobile = width <= 760;
  test.describe(`小黑屋 ${width}px`, () => {
    test.use({
      viewport: { width, height: 900 },
      hasTouch: mobile,
      isMobile: mobile,
      ...(mobile ? { userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/131.0.0.0 Mobile' } : {}),
    });

    const activate = (control: Locator) => (mobile ? control.tap() : control.press('Enter'));

    for (const skin of builtinSkins)
      for (const mode of ['light', 'dark'] as const)
        test(`${skin.name} ${mode} 入口、加载、失败重试、试玩和恢复`, async ({ page }) => {
          await page.addInitScript(
            ({ skinId, colorMode }) => {
              if (window !== window.top) return;
              localStorage.setItem('fish-island:skin', skinId);
              localStorage.setItem('fish-island:color-mode', colorMode);
            },
            { skinId: skin.id, colorMode: mode },
          );
          await page.route('https://**/*', (route) => route.abort());
          await page.route('**/api/**', (route) => route.abort());
          let releaseFailure = () => {};
          const failure = new Promise<void>((resolve) => {
            releaseFailure = resolve;
          });
          await page.route(
            '**/dark-room/vendor/script/engine.js',
            async (route) => {
              await failure;
              await route.abort();
            },
            { times: 1 },
          );

          await page.goto('/discover/games');
          await expect(page.getByText('玩过的游戏会留在这里，方便下次找到。')).toBeVisible();
          await activate(page.getByRole('button', { name: '打开小黑屋模拟器', exact: true }));
          await expect(page).toHaveURL('/game/darkRoom');
          try {
            await expect(page.getByRole('status').getByText('正在打开小黑屋…')).toBeVisible();
          } finally {
            releaseFailure();
          }
          await expect(page.getByRole('alert').getByText('小黑屋未能启动。')).toBeVisible();
          await activate(page.getByRole('button', { name: '重试', exact: true }));

          const game = page.frameLocator(frameSelector);
          const scene = game.getByRole('button', { name: '小黑屋', exact: true });
          await expect(scene).toHaveAttribute('aria-pressed', 'true');
          await expect(game.locator('html')).toHaveAttribute('data-color-mode', mode);
          expect(
            await game.locator('html').evaluate((root) => {
              const css = getComputedStyle(root);
              return {
                noOverflow: root.scrollWidth <= innerWidth,
                canvas: css.backgroundColor,
                scrollbar: css.scrollbarWidth,
              };
            }),
          ).toEqual({
            noOverflow: true,
            canvas: await page
              .locator('html')
              .evaluate((root) => getComputedStyle(root).backgroundColor),
            scrollbar: mobile ? 'none' : 'auto',
          });
          const fire = game.getByRole('button', { name: '生火', exact: true });
          expect((await fire.boundingBox())?.height).toBeGreaterThanOrEqual(mobile ? 44 : 32);
          await activate(fire);
          await expect(game.getByRole('button', { name: '生火间', exact: true })).toBeVisible();
          await expect(game.locator('#stokeButton')).toHaveAttribute('aria-disabled', 'true');

          const save = game.getByRole('button', { name: '存档', exact: true });
          await activate(save);
          const saveDialog = game.getByRole('dialog', { name: '导出/导入' });
          await expect(saveDialog).toBeVisible();
          await saveDialog.press('Escape');
          await expect(saveDialog).toHaveCount(0);
          await expect(save).toBeFocused();

          await expect
            .poll(() =>
              page.evaluate(
                (key) => JSON.parse(localStorage.getItem(key) ?? '{}').game?.fire?.value,
                saveKey,
              ),
            )
            .toBeGreaterThan(0);
          const pageLauncher = page
            .getByRole('banner')
            .getByRole('button', { name: '独立窗口打开小黑屋模拟器', exact: true });
          const back = page.getByRole('link', { name: '返回游戏', exact: true });
          expect((await pageLauncher.boundingBox())!.x).toBeGreaterThan(
            (await back.boundingBox())!.x,
          );
          await activate(pageLauncher);
          const window = page.getByRole('dialog', { name: '小黑屋模拟器', exact: true });
          const windowGame = window.frameLocator(frameSelector);
          const windowScene = windowGame.getByRole('button', { name: '生火间', exact: true });
          await expect(windowScene).toBeVisible();
          await expect(page.locator(frameSelector)).toHaveCount(1);
          if (mobile) {
            await window.getByRole('button', { name: '收起游戏窗口' }).tap();
          } else {
            await windowScene.press('Escape');
          }
          const resume = page.getByRole('button', { name: '继续小黑屋模拟器', exact: true });
          await expect(resume).toBeVisible();
          await activate(resume);
          await expect(windowScene).toBeVisible();
          await activate(window.getByRole('button', { name: '关闭游戏窗口' }));
          await expect(window).toHaveCount(0);
          await expect(pageLauncher).toBeFocused();
          await expect(game.getByRole('button', { name: '生火间', exact: true })).toBeVisible();

          await activate(page.getByRole('link', { name: '返回游戏', exact: true }));
          const recent = page.getByRole('button', { name: '小黑屋模拟器 再玩一次' });
          await expect(recent).toBeVisible();
          const cardLauncher = page.getByRole('button', {
            name: '独立窗口打开小黑屋模拟器',
            exact: true,
          });
          await activate(cardLauncher);
          await expect(windowScene).toBeVisible();
          await expect(page).toHaveURL('/discover/games');
          await activate(window.getByRole('button', { name: '关闭游戏窗口' }));
          await expect(cardLauncher).toBeFocused();
          await activate(recent);
          await expect(game.getByRole('button', { name: '生火间', exact: true })).toBeVisible();
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
        });
  });
}

test('小黑屋切换主题与模式时保留游戏文档及存档', async ({ page }) => {
  await page.route('https://**/*', (route) => route.abort());
  await page.route('**/api/**', (route) => route.abort());
  let gameLoads = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/dark-room/index.html') gameLoads++;
  });
  await page.goto('/game/darkRoom');
  const game = page.frameLocator(frameSelector);
  await game.getByRole('button', { name: '生火', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? '{}').game?.fire?.value,
        saveKey,
      ),
    )
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: '切换主题', exact: true }).click();
  const appearance = page.getByRole('dialog', { name: '主题模式' });
  await appearance.getByRole('button', { name: '暗夜模式', exact: true }).click();
  for (const skin of builtinSkins) {
    await appearance.getByRole('button', { name: skin.name, exact: true }).click();
    await expect(game.locator('html')).toHaveAttribute('data-color-mode', 'dark');
    await expect
      .poll(async () => {
        const [site, room] = await Promise.all([
          page
            .locator('html')
            .evaluate((root) => getComputedStyle(root).getPropertyValue('--color-accent')),
          game
            .locator('html')
            .evaluate((root) => getComputedStyle(root).getPropertyValue('--color-accent')),
        ]);
        return site.trim() === room.trim();
      })
      .toBe(true);
  }
  await appearance.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(game.getByRole('button', { name: '生火间', exact: true })).toBeVisible();
  expect(gameLoads).toBe(1);
  const after = await page.evaluate((key) => localStorage.getItem(key), saveKey);
  expect(JSON.parse(after!).game.fire.value).toBeGreaterThan(0);
});
