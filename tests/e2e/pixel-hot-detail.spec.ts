import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

test.setTimeout(120_000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: hot source scenery, wood messages and mobile selection`, async ({
      page,
    }, info) => {
      await page.addInitScript(
        ({ id, mode }) => {
          localStorage.setItem('fish-island:skin', id);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { id: skin.id, mode },
      );
      let state: 'loading' | 'success' | 'empty' | 'error' = 'loading';
      let requests = 0;
      let release: (() => void) | undefined;
      const sources = Array.from({ length: 18 }, (_, sourceIndex) => ({
        id: `source-${sourceIndex}`,
        name: sourceIndex ? `测试来源 ${sourceIndex + 1}` : '海岛主榜',
        categoryName: '综合',
        data: Array.from({ length: sourceIndex ? 1 : 30 }, (_, index) => ({
          title: `海岛测试来源${sourceIndex}热点${index + 1}`,
          url: `https://example.com/hot/${sourceIndex}/${index}`,
        })),
      }));
      await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
      await page.route('**/api/hot/list', async (route) => {
        requests++;
        if (state === 'loading')
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        if (state === 'error') return route.fulfill({ status: 503, body: 'synthetic failure' });
        return route.fulfill({ json: { code: 0, data: state === 'empty' ? [] : sources } });
      });
      await page.goto('/');
      await expect(page.getByRole('status').filter({ hasText: '正在获取各平台热榜' })).toBeVisible({
        timeout: 30000,
      });
      state = 'empty';
      release!();
      await expect(page.getByText('暂时没有热榜内容', { exact: true })).toBeVisible();
      state = 'error';
      await page.reload();
      await expect(page.getByRole('alert')).toBeVisible();
      state = 'success';
      await page.getByRole('button', { name: '重试', exact: true }).click();
      await expect(
        page.getByRole('link', { name: '海岛测试来源0热点1', exact: true }),
      ).toBeVisible();
      const before = requests;
      if (skin.id === 'wps') {
        await page.getByRole('searchbox', { name: '查找热榜' }).fill('海岛测试来源0热点30');
        await expect(
          page.getByRole('link', { name: '海岛测试来源0热点30', exact: true }),
        ).toBeVisible();
        await expect(page.locator('[data-island-source-scene]')).toHaveCount(0);
      } else {
        if (page.viewportSize()!.width <= 760) {
          await page.getByRole('button', { name: '热榜来源：全部热榜', exact: true }).tap();
          const dialog = page.getByRole('dialog', { name: '选择热榜来源', exact: true });
          if (skin.id === 'pixel-island')
            await expect(dialog.locator('[data-island-source-scene]')).toBeVisible();
          else await expect(dialog.locator('[data-island-source-scene]')).toHaveCount(0);
          const scroll = dialog.getByRole('region', { name: '可选热榜来源', exact: true });
          await scroll.focus();
          await scroll.press('End');
          await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
          await dialog
            .getByRole('textbox', { name: '搜索可选热榜来源', exact: true })
            .fill('没有这个来源');
          await expect(dialog.getByText('没有匹配的来源，试试其他关键词')).toBeVisible();
          await dialog
            .getByRole('textbox', { name: '搜索可选热榜来源', exact: true })
            .fill('海岛主榜');
          await page.screenshot({
            path: info.outputPath('mobile-source-picker.png'),
            scale: 'css',
          });
          await dialog.getByRole('button', { name: '海岛主榜', exact: true }).tap();
          await expect(dialog).toHaveCount(0);
          await expect(
            page.getByRole('button', { name: '热榜来源：海岛主榜', exact: true }),
          ).toBeFocused();
        } else {
          const sidebar = page.getByRole('complementary', { name: '热榜来源', exact: true });
          if (skin.id === 'pixel-island')
            await expect(sidebar.locator('[data-island-source-scene]')).toBeVisible();
          await sidebar
            .getByRole('textbox', { name: '搜索热榜来源', exact: true })
            .fill('海岛主榜');
          await sidebar.getByRole('button').filter({ hasText: '海岛主榜' }).click();
        }
        const detail = page.getByRole('region', { name: '海岛主榜消息', exact: true });
        await expect(detail).toBeVisible();
        const bubble = detail
          .getByRole('article', { name: '第 1 条热点', exact: true })
          .locator(':scope > div');
        await expect(bubble).toHaveCSS(
          'border-top-width',
          skin.id === 'pixel-island' ? '3px' : '0px',
        );
        if (skin.id === 'pixel-island')
          expect(await bubble.evaluate((el) => getComputedStyle(el, '::before').display)).toBe(
            'none',
          );
        const last = detail.getByRole('link', { name: '海岛测试来源0热点30', exact: true });
        await last.scrollIntoViewIfNeeded();
        await expect(last).toBeInViewport();
        const scroll = page.getByRole('region', { name: '主内容滚动区', exact: true });
        expect(await scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
        await scroll.focus();
        await scroll.press('Home');
        await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBe(0);
        await page.screenshot({ path: info.outputPath('hot-wood-detail.png'), scale: 'css' });
        await page.getByRole('button', { name: '返回全部热榜', exact: true }).click();
        await expect(
          page.getByRole('button', { name: '查看海岛主榜消息', exact: true }),
        ).toBeVisible();
      }
      expect(requests).toBe(before);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
