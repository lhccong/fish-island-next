import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

test.setTimeout(120_000);

for (const skin of builtinSkins) {
  for (const mode of ['light', 'dark'] as const) {
    test(`${skin.id} ${mode}: about navigation, feedback and layout`, async ({
      page,
      isMobile,
    }, info) => {
      await page.addInitScript(
        ({ id, colorMode }) => {
          localStorage.setItem('fish-island:skin', id);
          localStorage.setItem('fish-island:color-mode', colorMode);
          Object.defineProperty(navigator, 'clipboard', {
            value: {
              writeText: async (text: string) => {
                await new Promise((resolve) => setTimeout(resolve, 450));
                if (localStorage.getItem('about-copy-fail')) throw new Error('denied');
                localStorage.setItem('about-copied-text', text);
              },
            },
            configurable: true,
          });
        },
        { id: skin.id, colorMode: mode },
      );
      await page.route('**/api/**', (route) => route.abort());
      let failImage = true;
      let finishImage: (() => void) | undefined;
      await page.route('**/qq-about*.png*', async (route) => {
        if (route.request().resourceType() !== 'image') return route.continue();
        await new Promise<void>((resolve) => {
          finishImage = resolve;
        });
        if (failImage) await route.abort();
        else await route.continue();
      });
      await page.goto('/discover/games');
      const nav = page.getByRole('navigation', { name: '发现菜单' }).filter({ visible: true });
      await expect(nav.getByRole('link')).toHaveText(['朋友圈', '游戏', '阅读', '关于', '伙伴']);
      const aboutLink = nav.getByRole('link', { name: '关于', exact: true });
      if (isMobile) await aboutLink.tap();
      else await aboutLink.click();
      await expect(page).toHaveURL(/\/about$/);
      await expect(nav.getByRole('link', { name: '关于', exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      );
      await expect(page.getByText('正在加载QQ群二维码…')).toBeVisible();
      await page.screenshot({ path: info.outputPath('loading.png') });
      finishImage?.();
      await expect(page.getByRole('alert')).toContainText('二维码加载失败');
      await page.screenshot({ path: info.outputPath('image-error.png') });
      failImage = false;
      finishImage = undefined;
      await page.getByRole('button', { name: '重新加载二维码' }).click();
      await expect(page.getByText('正在加载QQ群二维码…')).toBeVisible();
      await expect.poll(() => finishImage !== undefined).toBe(true);
      finishImage?.();
      await expect(page.getByText('正在加载QQ群二维码…')).toBeHidden();
      expect(
        await page
          .getByRole('img', { name: 'QQ群二维码' })
          .evaluate((el: HTMLImageElement) => el.naturalWidth),
      ).toBeGreaterThan(0);
      const copy = page.getByRole('button', { name: '复制', exact: true });
      if (isMobile) await copy.tap();
      else await copy.click();
      await expect(page.getByRole('button', { name: '复制中…' })).toBeDisabled();
      await page.screenshot({ path: info.outputPath('copy-pending.png') });
      await expect(page.getByRole('status')).toContainText('QQ群号已复制');
      expect(await page.evaluate(() => localStorage.getItem('about-copied-text'))).toBe(
        '695425036',
      );
      await page.screenshot({ path: info.outputPath('ready-top.png') });
      const doc = page.getByRole('link', { name: '【腾讯文档】摸鱼岛需求与Bug' });
      await expect(doc).toHaveAttribute(
        'href',
        'https://docs.qq.com/sheet/DSXdWdk9rbGNqT2NT?tab=BB08J2',
      );
      await expect(doc).toHaveAttribute('rel', 'noopener noreferrer');
      await doc.focus();
      await expect(doc).toBeFocused();
      const scroll = page.getByRole('region', { name: '关于摸鱼岛', exact: true });
      await scroll.hover();
      for (const fraction of [0, 0.5, 1]) {
        await scroll.evaluate((el, part) => {
          el.scrollTop = (el.scrollHeight - el.clientHeight) * part;
        }, fraction);
        const layout = await scroll.evaluate((el) => {
          const article = el.querySelector('article')!;
          const rect = article.getBoundingClientRect();
          return {
            overflow: el.scrollWidth - el.clientWidth,
            gap: el.getBoundingClientRect().right - rect.right,
            articleOverflow: article.scrollWidth - article.clientWidth,
          };
        });
        expect(layout.overflow).toBeLessThanOrEqual(1);
        expect(layout.articleOverflow).toBeLessThanOrEqual(1);
        expect(layout.gap).toBeGreaterThanOrEqual(
          info.project.name === 'desktop-chromium' ? 24 : 20,
        );
        await page.screenshot({ path: info.outputPath(`ready-scroll-${fraction}.png`) });
      }
      await expect(page.getByText('头像框兑换功能', { exact: true })).toBeInViewport();
      await scroll.focus();
      await page.keyboard.press('Home');
      await copy.scrollIntoViewIfNeeded();
      await page.evaluate(() => localStorage.setItem('about-copy-fail', 'true'));
      await copy.click();
      await expect(page.getByRole('alert')).toContainText('复制失败，请手动复制');
      await page.screenshot({ path: info.outputPath('copy-error.png') });
      await page.getByRole('button', { name: '切换主题', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: '主题模式' });
      const alternate = builtinSkins.find((item) => item.id !== skin.id)!;
      await dialog.getByRole('button', { name: alternate.name, exact: true }).click();
      await dialog
        .getByRole('button', { name: mode === 'light' ? '暗夜模式' : '明亮模式', exact: true })
        .click();
      await dialog.getByRole('button', { name: skin.name, exact: true }).click();
      await dialog
        .getByRole('button', { name: mode === 'light' ? '明亮模式' : '暗夜模式', exact: true })
        .click();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('alert')).toContainText('复制失败，请手动复制');
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expect(page.getByRole('heading', { level: 3 })).toHaveCount(6);
    });
  }
}
