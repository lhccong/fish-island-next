import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

const gameUrl = 'https://www.milkywayidle.com/#';
const gameDocument = 'https://www.milkywayidle.com/';
const frameSelector = 'iframe[title="奶牛放置"]';
const playButton = { name: '试玩测试', exact: true } as const;
const windowButton = { name: '独立窗口打开奶牛放置', exact: true } as const;

for (const width of [1440, 375, 390]) {
  const mobile = width <= 760;
  test.describe(`奶牛放置 ${width}px`, () => {
    test.use({ viewport: { width, height: 840 }, hasTouch: mobile, isMobile: mobile });
    const activate = (control: Locator) => (mobile ? control.tap() : control.press('Enter'));

    for (const skin of builtinSkins)
      for (const mode of ['light', 'dark'] as const)
        test(`${skin.name} ${mode} 目录、加载重试与独立窗口`, async ({ page }) => {
          await page.addInitScript(
            ({ skinId, colorMode }) => {
              if (window !== window.top) return;
              localStorage.setItem('fish-island:skin', skinId);
              localStorage.setItem('fish-island:color-mode', colorMode);
            },
            { skinId: skin.id, colorMode: mode },
          );
          await page.clock.install();
          await page.route('https://**/*', (route) => route.abort());
          await page.route('**/api/**', (route) => route.abort());

          let release = () => {};
          const pending = new Promise<void>((resolve) => {
            release = resolve;
          });
          let loads = 0;
          await page.route(gameDocument, async (route) => {
            loads++;
            if (loads === 1) {
              await pending;
              await route.abort().catch(() => {});
              return;
            }
            await route.fulfill({
              contentType: 'text/html; charset=utf-8',
              body: '<!doctype html><style>button{min-height:44px}</style><button onclick="document.querySelector(\'output\').value = 1">试玩测试</button><output>0</output>',
            });
          });

          await page.goto('/discover/games');
          await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
          await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
          const catalogCard = page.getByRole('button', { name: '打开奶牛放置', exact: true });
          await expect(catalogCard).toBeVisible();
          await activate(catalogCard);
          await expect(page).toHaveURL('/game/milky-way-idle');
          try {
            await expect(page.getByRole('status')).toHaveText('正在打开奶牛放置…');
            await expect.poll(() => loads).toBe(1);
            await page.clock.fastForward(15_100);
            await expect(page.getByRole('alert')).toHaveText(/奶牛放置加载失败/);
          } finally {
            release();
          }

          await activate(page.getByRole('button', { name: '重试', exact: true }));
          const frame = page.locator(frameSelector);
          const game = page.frameLocator(frameSelector);
          await expect(game.getByRole('button', playButton)).toBeVisible();
          await expect(page.getByRole('link', { name: /在官网打开/ })).toHaveCount(0);
          await expect(frame).toHaveAttribute('src', gameUrl);
          await expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
          await activate(game.getByRole('button', playButton));
          await expect(game.locator('output')).toHaveText('1');
          expect((await frame.boundingBox())!.height).toBeGreaterThan(mobile ? 540 : 530);

          const pageLauncher = page.getByRole('button', windowButton);
          await activate(pageLauncher);
          const window = page.getByRole('dialog', { name: '奶牛放置' });
          const close = window.getByRole('button', { name: '关闭游戏窗口', exact: true });
          await expect(window.getByRole('link', { name: /在官网打开/ })).toHaveCount(0);
          await expect(frame).toHaveCount(1);
          await expect(game.getByRole('button', playButton)).toBeVisible();
          const bounds = (await frame.boundingBox())!;
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
          expect(bounds.width).toBeGreaterThan(mobile ? width - 40 : 560);
          expect(bounds.height).toBeGreaterThan(mobile ? 540 : 530);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
          await activate(game.getByRole('button', playButton));
          await expect(game.locator('output')).toHaveText('1');
          await expect.poll(() => loads).toBe(3);
          if (mobile) {
            await activate(window.getByRole('button', { name: '收起游戏窗口', exact: true }));
          } else {
            await close.press('Escape');
          }
          await expect(window).toBeHidden();
          await expect(pageLauncher).toBeFocused();
          await activate(page.getByRole('button', { name: '继续奶牛放置', exact: true }));
          await expect(game.locator('output')).toHaveText('1');
          expect(loads).toBe(3);
          await activate(close);
          await expect(pageLauncher).toBeFocused();
          await expect(game.getByRole('button', playButton)).toBeVisible();

          await activate(page.getByRole('link', { name: '返回游戏', exact: true }));
          await expect(page).toHaveURL('/discover/games');
          await expect(page.getByRole('button', { name: '奶牛放置 再玩一次' })).toBeVisible();
          const catalogLauncher = page.getByRole('button', windowButton);
          await activate(catalogLauncher);
          await expect(game.getByRole('button', playButton)).toBeVisible();
          await activate(close);
          await expect(catalogLauncher).toBeFocused();
        });
  });
}

test('切换主题与模式保留已加载的游戏文档', async ({ page }) => {
  let loads = 0;
  await page.route(gameDocument, async (route) => {
    loads++;
    await route.fulfill({ body: '<!doctype html><title>奶牛放置测试</title>' });
  });
  await page.goto('/game/milky-way-idle');
  const frame = page.locator(frameSelector);
  await expect(frame).toBeVisible();
  await expect.poll(() => loads).toBe(1);

  await page.getByRole('button', { name: '切换主题', exact: true }).click();
  const appearance = page.getByRole('dialog', { name: '主题模式' });
  await appearance.getByRole('button', { name: '暗夜模式', exact: true }).click();
  for (const skin of builtinSkins) {
    await appearance.getByRole('button', { name: skin.name, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
  }
  await appearance.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(frame).toBeVisible();
  expect(loads).toBe(1);
});
