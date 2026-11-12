import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: styled import portal, states and pagination retry`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(60_000);
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skin: skin.id, mode },
      );
      await page.route('**/api/**', (route) => route.abort());
      await page.route('https://covers.test/**', (route) =>
        route.fulfill({ status: 404, body: '' }),
      );
      let state = 'empty';
      let moreAttempt = 0;
      let firstSearch = true;
      let releaseSearch!: () => void;
      const searchGate = new Promise<void>((resolve) => {
        releaseSearch = resolve;
      });
      page.once('close', () => releaseSearch());
      await page.route('**/reader3/searchBookMultiSSE*', async (route) => {
        const params = new URL(route.request().url()).searchParams;
        expect(params.get('accessToken') === 'synthetic-reader-default').toBe(true);
        if (firstSearch) {
          firstSearch = false;
          await searchGate;
        }
        if (state === 'error') {
          await route.fulfill({ status: 503, body: '{}' });
          return;
        }
        const more = params.get('page') === '2';
        if (more) {
          expect(params.get('lastIndex')).toBe('5');
          moreAttempt++;
          if (moreAttempt === 1) {
            await route.fulfill({
              contentType: 'text/event-stream',
              body: 'data: {"data":[{"name":"分页新增书","bookUrl":"book-more","origin":"source"}],"lastIndex":99}\n\nevent: error\ndata: {"isSuccess":false}\n\n',
            });
            return;
          }
        }
        const data =
          state === 'empty'
            ? []
            : more
              ? [{ name: '分页新增书', bookUrl: 'book-more', origin: 'source' }]
              : Array.from({ length: 12 }, (_, index) => ({
                  name: `书籍${index + 1}：一段足够长的小说名字用于窄屏换行验证`,
                  bookUrl: `book-${index}`,
                  origin: 'source',
                  originName: index ? '备用书源' : '主书源 · 长来源名称适配验证',
                  author: '合成作者',
                  kind: '玄幻,连载',
                  wordCount: '120万字',
                  latestChapterTitle: '最新章节验收',
                  coverUrl: 'https://covers.test/missing.png',
                  intro: '<p>这是简介。用于检查真实书源常见 HTML 简介可以转为干净的文字。</p>',
                }));
        await route.fulfill({
          contentType: 'text/event-stream',
          body: `data: ${JSON.stringify({ data, lastIndex: more ? 8 : 5 })}\n\nevent: end\ndata: ${JSON.stringify({ lastIndex: more ? 8 : 5, isEnd: more })}\n\n`,
        });
      });
      await page.goto('/reader');
      const trigger = page.getByRole('button', { name: '添加书籍', exact: true });
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: '添加书籍', exact: true });
      const input = dialog.getByRole('textbox', { name: '书名或作者' });
      await expect(dialog.getByRole('heading', { name: '下一本好书，从这里开始' })).toBeVisible();
      expect((await dialog.boundingBox())!.height).toBeLessThan(550);
      expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const styling = await input.evaluate((element) => ({
        border: getComputedStyle(element).borderTopWidth,
        outline: getComputedStyle(element).outlineStyle,
        frameRadius: parseFloat(getComputedStyle(element.parentElement!).borderRadius),
      }));
      expect(styling.border).toBe('0px');
      expect(styling.frameRadius).toBeGreaterThanOrEqual(8);
      await page.screenshot({ path: testInfo.outputPath('import-idle.png') });
      await input.fill('测试小说');
      await dialog.getByRole('button', { name: '搜索', exact: true }).click();
      await expect(dialog.getByRole('status')).toContainText('正在搜索书源');
      await page.screenshot({ path: testInfo.outputPath('import-loading.png') });
      releaseSearch();
      await expect(dialog.getByRole('heading', { name: '没有找到相关书籍' })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath('import-empty.png') });
      state = 'error';
      await dialog.getByRole('button', { name: '搜索', exact: true }).click();
      await expect(dialog.getByRole('alert')).toContainText('503');
      expect((await dialog.boundingBox())!.height).toBeLessThan(500);
      await page.screenshot({ path: testInfo.outputPath('import-error.png') });
      state = 'ready';
      await dialog.getByRole('button', { name: '重试搜索' }).click();
      await expect(dialog.getByRole('button', { name: '加入书架' })).toHaveCount(12);
      const firstResult = dialog.locator('article').first();
      await expect(firstResult).toContainText('玄幻');
      await expect(firstResult).toContainText('120万字');
      await expect(firstResult).toContainText('最新章节验收');
      await firstResult.locator('summary').click();
      await expect(firstResult.locator('details')).toHaveAttribute('open', '');
      await firstResult.locator('summary').press('Enter');
      await expect(firstResult.locator('details')).not.toHaveAttribute('open', '');
      await dialog.getByRole('button', { name: '加入书架' }).first().click();
      await expect(dialog.getByRole('button', { name: '已在书架' })).toBeDisabled();
      expect(
        await dialog
          .getByRole('region', { name: '在线搜索结果' })
          .evaluate((element) => element.scrollHeight > element.clientHeight),
      ).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('import-results.png') });
      await dialog.getByRole('button', { name: '加载更多' }).click();
      await expect(dialog.getByRole('alert')).toContainText('书源搜索失败');
      await dialog.getByRole('button', { name: '重试搜索' }).click();
      await expect(dialog.getByRole('heading', { name: '分页新增书', exact: true })).toHaveCount(1);
      await expect(dialog.getByRole('button', { name: '加载更多' })).toHaveCount(0);
      await page
        .locator('input[type="file"]')
        .setInputFiles({ name: '空文件.txt', mimeType: 'text/plain', buffer: Buffer.from('') });
      await expect(dialog.getByRole('alert')).toContainText('没有可阅读的文字');
      await dialog.getByRole('button', { name: '关闭添加书籍' }).click();
      await expect(trigger).toBeFocused();
      await trigger.click();
      await expect(dialog.getByRole('alert')).toHaveCount(0);
      await input.fill('输入草稿');
      await dialog.press('Escape');
      await expect(trigger).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
