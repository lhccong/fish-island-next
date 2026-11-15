import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

test.setTimeout(60_000);

for (const skin of builtinSkins) {
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: footer remains reachable in every hot board state`, async ({
      page,
    }, testInfo) => {
      await page.addInitScript(
        ({ skinId, mode }) => {
          localStorage.setItem('fish-island:skin', skinId);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skinId: skin.id, mode },
      );
      let state = 'loading';
      let releaseLoading = () => {};
      const loading = new Promise<void>((resolve) => {
        releaseLoading = resolve;
      });
      await page.route('**/api/hot/list', async (route) => {
        if (state === 'loading') await loading;
        await route.fulfill({
          json:
            state === 'error'
              ? { code: 500, message: '服务维护' }
              : {
                  code: 0,
                  data:
                    state === 'empty'
                      ? []
                      : Array.from({ length: 6 }, (_, index) => ({
                          id: String(index + 1),
                          name: `热榜来源 ${index + 1}`,
                          categoryName: '综合资讯',
                          data: Array.from({ length: 12 }, (_, rank) => ({
                            title: '今日热点',
                            url: `https://example.com/hot/${index}/${rank}`,
                          })),
                        })),
                },
        });
      });

      await page.goto('/', { waitUntil: 'domcontentloaded' });
      for (const nextState of ['loading', 'error', 'empty', 'success']) {
        state = nextState;
        if (state === 'error') releaseLoading();
        if (state === 'empty')
          await page.getByRole('button', { name: '重试', exact: true }).click();
        if (state === 'success')
          await page.getByRole('button', { name: '刷新热榜', exact: true }).click();
        if (state === 'loading') {
          await expect(page.getByText('正在获取各平台热榜…', { exact: true })).toBeVisible();
          await expect(page.locator('footer[aria-label="网站备案与版权"]:visible')).toHaveCount(1);
          expect(
            await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight),
          ).toBe(true);
          continue;
        }
        if (state === 'error') await expect(page.getByRole('alert')).toContainText('服务维护');
        if (state === 'empty')
          await expect(page.getByRole('heading', { name: '暂时没有热榜内容' })).toBeVisible();
        if (state === 'success')
          await expect(
            page.getByRole('link', { name: '今日热点', exact: true }).first(),
          ).toBeVisible();

        const footer = page.locator('footer[aria-label="网站备案与版权"]:visible');
        const link = footer.getByRole('link', { name: '粤ICP备2024313392号' });
        await expect(footer).toHaveCSS(
          'position',
          page.viewportSize()!.width <= 760 ? 'fixed' : 'static',
        );
        await expect(footer).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        if (state === 'success' && page.viewportSize()!.width > 760) {
          await expect(footer).not.toBeInViewport();
          const scroll = page.getByRole('region', { name: '主内容滚动区', exact: true });
          await scroll.focus();
          await scroll.press('End');
        }
        await footer.scrollIntoViewIfNeeded();
        await expect(footer).toBeInViewport();
        await expect(link).toHaveAttribute('href', 'https://beian.miit.gov.cn/');
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        await expect(footer).toContainText('MIT 协议, 版权所有 © 2025 聪，All rights reserved.');
        await link.focus();
        await expect(link).toBeFocused();
        await link.hover();
        const bounds = await footer.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
        expect(await footer.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        if (page.viewportSize()!.width <= 760) {
          expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
          await link.tap({ trial: true });
        }
        if (state === 'success') await page.screenshot({ path: testInfo.outputPath('footer.png') });
      }
      for (const path of ['/discover', '/foundation', '/missing-footer-page']) {
        await page.goto(path);
        if (path === '/discover')
          await expect(page.locator('#main-content')).toBeVisible({ timeout: 15_000 });
        if (path === '/foundation')
          await expect(page.getByText('工程已初始化', { exact: true })).toBeVisible();
        if (path === '/missing-footer-page')
          await expect(page.getByRole('heading', { name: '页面不存在' })).toBeVisible();
        const footer = page.locator('footer[aria-label="网站备案与版权"]:visible');
        if (page.viewportSize()!.width <= 760) {
          await expect(footer).toHaveCount(0);
          continue;
        }
        await expect(footer).toHaveCount(1);
        await footer.scrollIntoViewIfNeeded();
        await expect(footer).toBeInViewport();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
    });
  }
}
