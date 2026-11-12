import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'] as const)
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: route loading and completion`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: width === 1440 ? 900 : 812 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.addInitScript(
          ({ skinId, colorMode }) => {
            localStorage.setItem('fish-island:skin', skinId);
            localStorage.setItem('fish-island:color-mode', colorMode);
          },
          { skinId: skin.id, colorMode: mode },
        );
        await page.route('**/api/**', (route) => route.abort());
        let release = () => {};
        const pending = new Promise<void>((resolve) => {
          release = resolve;
        });
        await page.route(/\/src\/app\/pages\/InitializationPage\.tsx(?:\?.*)?$/, async (route) => {
          await pending;
          await route.continue();
        });
        try {
          await page.goto('/foundation', { waitUntil: 'domcontentloaded' });
          const loading = page.getByRole('main');
          await expect(loading).toHaveAttribute('aria-busy', 'true');
          await expect(page.getByRole('status')).toContainText('正在打开页面');
          await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
          await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
          const layout = await loading.evaluate((element) => {
            const rect = element.getBoundingClientRect();
            const content = element.firstElementChild!.getBoundingClientRect();
            const ring = element.querySelector('span')!;
            return {
              overflow: document.documentElement.scrollWidth > innerWidth,
              centeredX: Math.abs(content.x + content.width / 2 - innerWidth / 2) < 1,
              centeredY: Math.abs(content.y + content.height / 2 - innerHeight / 2) < 1,
              fullHeight: rect.height >= innerHeight,
              background: getComputedStyle(element).backgroundColor,
              animation: getComputedStyle(ring).animationName,
            };
          });
          expect(layout).toMatchObject({
            overflow: false,
            centeredX: true,
            centeredY: true,
            fullHeight: true,
            animation: 'none',
          });
          if (mode === 'dark') expect(layout.background).toBe('rgb(25, 26, 28)');
          await page.screenshot({ path: info.outputPath('loading.png') });
          await page.emulateMedia({ reducedMotion: 'no-preference' });
          await expect(loading.locator('span')).toHaveCSS('animation-duration', '1.2s');
          release();
          await expect(page.getByRole('link', { name: '鱼岛首页' })).toBeVisible();
          await expect(page.locator('main[aria-busy="true"]')).toHaveCount(0);
        } finally {
          release();
        }
      });
    }
