import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { scrollChapter } from './reader-scroll-fixture';

async function navigationAboveChapter(reader: Locator) {
  const header = (await reader.locator('header').boundingBox())!;
  const navigation = (await reader
    .getByRole('button', { name: '下一章', exact: true })
    .locator('..')
    .boundingBox())!;
  const chapter = (await reader.locator('[tabindex="-1"]').boundingBox())!;
  expect(Math.abs(header.y + header.height - navigation.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(navigation.y + navigation.height - chapter.y)).toBeLessThanOrEqual(2);
  expect(await reader.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);
}
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: 旧版阅读布局、切章焦点和设置`, async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const touch = testInfo.project.use.hasTouch === true;
      const press = (button: Locator) => (touch ? button.tap() : button.click());
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
          localStorage.setItem(
            'fish-reader-books',
            JSON.stringify([
              {
                id: 'layout-book',
                title: '阅读布局验收',
                url: 'https://books.test/layout',
                source: 'online',
                chapters: [
                  { index: 0, title: '第一章', content: '第一章正文\n第一章测试文字。' },
                  { index: 1, title: '第二卷', isVolume: true },
                  { index: 2, title: '第二章' },
                ],
              },
            ]),
          );
        },
        { skin: skin.id, mode },
      );
      await page.route('**/api/**', (route) => route.abort());
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      page.once('close', () => release());
      let first = true;
      let fail = true;
      let requests = 0;
      const indices: number[] = [];
      await page.route('**/reader3/getBookContent*', async (route) => {
        const body = route.request().postDataJSON() as { index: number };
        indices.push(body.index);
        requests++;
        if (first) {
          first = false;
          await gate;
        }
        await route.fulfill(
          fail
            ? { status: 503, body: '{}' }
            : { json: { data: `第二章正文\n${'第二章测试文字。\n'.repeat(80)}` } },
        );
      });
      await page.route('**/reader3/getChapterList*', (route) =>
        route.fulfill({ json: { data: [] } }),
      );
      await page.goto('/reader');
      await page.getByRole('button', { name: '继续阅读', exact: true }).click();
      const reader = page.getByRole('region', { name: '阅读器', exact: true, includeHidden: true });
      await expect(reader.getByText('第一章正文', { exact: true })).toBeVisible();
      await navigationAboveChapter(reader);
      const finder = reader.getByRole('button', { name: '搜索当前章节', exact: true });
      const search = reader.getByRole('textbox', { name: '当前章节搜索' });
      const viewport = reader.getByRole('region', { name: '章节正文', exact: true });
      if (touch) {
        const word = reader.getByRole('button', { name: 'Word模式', exact: true });
        const drag = reader.getByRole('button', { name: '拖动阅读窗口', exact: true });
        const pip = reader.getByRole('button', { name: '画中画', exact: true });
        expect((await word.boundingBox())!.y).toBe((await drag.boundingBox())!.y);
        expect((await pip.boundingBox())!.y).toBe((await finder.boundingBox())!.y);
      }
      await expect(search).toBeHidden();
      await press(finder);
      await expect(search).toBeFocused();
      await search.fill('正文');
      if (!touch) {
        await page.keyboard.press('ArrowRight');
        await expect(reader.getByRole('heading', { name: '第一章', exact: true })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(finder).toBeFocused();
        await press(finder);
      }
      // DevTools can detach the search row or a rendered paragraph.
      await search.evaluate((input) => input.parentElement!.remove());
      await viewport.locator('[data-paragraph="0"]').evaluate((paragraph) => paragraph.remove());
      const next = reader.getByRole('button', { name: '下一章', exact: true });
      if (touch) await press(next);
      else await page.keyboard.press('ArrowRight');
      await expect(reader.getByRole('status')).toContainText('正在加载章节');
      await navigationAboveChapter(reader);
      await page.screenshot({ path: testInfo.outputPath('chapter-loading.png') });
      if (page.viewportSize()!.width > 760) {
        await reader.getByRole('button', { name: '切换全屏' }).click();
        await navigationAboveChapter(reader);
        await reader.getByRole('button', { name: '切换全屏' }).click();
      }
      release();
      await expect(reader.getByRole('alert')).toContainText('503');
      await navigationAboveChapter(reader);
      await page.screenshot({ path: testInfo.outputPath('chapter-error.png') });
      fail = false;
      await press(reader.getByRole('button', { name: '重试章节' }));
      await expect(reader.getByText('第二章正文', { exact: true })).toBeVisible();
      await expect(search).toBeHidden();
      await expect(viewport).toBeFocused();
      const scrollTop = () => viewport.evaluate((element) => element.scrollTop);
      expect(await viewport.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(
        0,
      );
      const scrollbar = viewport.locator('..').locator('[data-orientation="vertical"]');
      await expect(scrollbar).toHaveCSS('visibility', touch ? 'hidden' : 'visible');
      if (touch) {
        expect((await next.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        await scrollChapter(page, viewport, true);
        await expect.poll(scrollTop).toBeGreaterThan(0);
      } else {
        await expect(scrollbar).toHaveCSS('opacity', '1');
        await page.keyboard.press('ArrowDown');
        await expect.poll(scrollTop).toBeGreaterThan(0);
        await page.keyboard.press('ArrowUp');
        await expect.poll(scrollTop).toBe(0);
      }
      expect(indices).toEqual([2, 2]);
      await navigationAboveChapter(reader);
      const beforeSettings = requests;
      await reader.getByRole('button', { name: '阅读器设置' }).click();
      const settings = page.getByRole('dialog', { name: '阅读设置', exact: true });
      expect((await settings.boundingBox())!.width).toBeLessThanOrEqual(420);
      await expect(settings.getByRole('tab')).toHaveCount(3);
      await page.screenshot({ path: testInfo.outputPath('settings-reading-initial.png') });
      const reading = settings.getByRole('tabpanel', { name: '阅读设置', exact: true });
      await expect(reading.getByRole('slider')).toHaveCount(5);
      const font = reading.getByRole('slider', { name: '字号', exact: true });
      const rangeBox = (await font.boundingBox())!;
      if (page.viewportSize()!.width <= 760)
        await font.tap({ position: { x: rangeBox.width * 0.8, y: rangeBox.height / 2 } });
      else await font.click({ position: { x: rangeBox.width * 0.8, y: rangeBox.height / 2 } });
      expect(Number(await font.inputValue())).toBeGreaterThan(18);
      await font.press('End');
      await expect(font).toHaveValue('40');
      await font.press('Home');
      await expect(font).toHaveValue('12');
      await font.press('ArrowRight');
      await expect(font).toHaveValue('13');
      await reading.getByText('背景颜色', { exact: true }).click();
      await reading.getByRole('button', { name: '背景颜色：淡绿色护眼', exact: true }).click();
      expect(await reader.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(
        mode === 'dark' ? 'rgb(32, 41, 31)' : 'rgb(238, 245, 219)',
      );
      await page.screenshot({ path: testInfo.outputPath('settings-reading.png') });
      await reading.getByText('背景颜色', { exact: true }).click();
      await reading.getByRole('button', { name: '背景颜色：纸张', exact: true }).click();
      await expect(
        reading.getByRole('textbox', { name: '自定义背景颜色', exact: true }),
      ).toHaveValue(mode === 'dark' ? '#29251f' : '#f0e6d2');
      await reading.getByRole('textbox', { name: '自定义背景颜色', exact: true }).fill('#334455');
      await expect(
        reading.getByRole('textbox', { name: '自定义背景颜色', exact: true }),
      ).toHaveValue('#334455');
      await reading.getByText('窗口、快捷键与阅读服务', { exact: true }).click();
      const server = reading.getByLabel('API 服务地址', { exact: true });
      await server.fill('https://draft.test/reader3');
      await settings.getByRole('tab', { name: '阅读设置', exact: true }).focus();
      await settings.getByRole('tab', { name: '阅读设置', exact: true }).press('ArrowRight');
      await expect(settings.getByRole('tab', { name: '主题设置', exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await settings.getByRole('button', { name: '纸张', exact: true }).click();
      await page.screenshot({ path: testInfo.outputPath('settings-themes-initial.png') });
      await expect(settings.getByRole('button', { name: '纸张', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await settings.getByText('自定义正文主题', { exact: true }).click();
      await settings.getByLabel('主题名称', { exact: true }).fill('主题草稿');
      await page.screenshot({ path: testInfo.outputPath('settings-themes.png') });
      await settings.getByRole('tab', { name: '朗读设置', exact: true }).click();
      const speech = settings.getByRole('tabpanel', { name: '朗读设置', exact: true });
      await expect(speech.getByRole('slider', { name: '音量', exact: true })).toBeDisabled();
      await speech.getByRole('switch', { name: '启用朗读功能' }).click();
      await speech.getByRole('slider', { name: '音量', exact: true }).press('Home');
      await expect(speech.getByRole('slider', { name: '音量', exact: true })).toHaveValue('0');
      await speech.getByRole('combobox', { name: '声音' }).click();
      await page.getByRole('listbox').press('Escape');
      await expect(settings).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath('settings-speech.png') });
      await settings.getByRole('tab', { name: '主题设置', exact: true }).click();
      await expect(settings.getByLabel('主题名称', { exact: true })).toHaveValue('主题草稿');
      await settings.getByRole('tab', { name: '阅读设置', exact: true }).click();
      await expect(server).toHaveValue('https://draft.test/reader3');
      await expect(settings.getByRole('button', { name: '完成', exact: true })).toBeVisible();
      expect(await settings.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      await settings.getByRole('button', { name: '关闭阅读设置' }).click();
      await expect(reader.getByRole('button', { name: '阅读器设置' })).toBeFocused();
      expect(requests).toBe(beforeSettings);
      await navigationAboveChapter(reader);
      await reader.getByRole('button', { name: '刷新阅读内容' }).click();
      await expect(reader.getByRole('heading', { name: '目录为空' })).toBeVisible();
      await navigationAboveChapter(reader);
      expect(errors).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath('chapter-empty.png') });
      await reader.getByRole('button', { name: '关闭阅读器' }).click();
      await page.reload();
      await page.getByRole('button', { name: '阅读设置', exact: true }).click();
      await settings.getByRole('tab', { name: '主题设置', exact: true }).click();
      await expect(settings.getByRole('button', { name: '纸张', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await settings.getByRole('tab', { name: '朗读设置', exact: true }).click();
      await expect(settings.getByRole('slider', { name: '音量', exact: true })).toHaveValue('0');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: Excel 小窗下保留小说样式和翻章`, async ({
      page,
      hasTouch,
    }, testInfo) => {
      await setupChatMenu(page, skin.id, mode, 'user', () =>
        page.addInitScript(() => {
          localStorage.setItem(
            'fish-reader-books',
            JSON.stringify([
              {
                id: 'reader-excel',
                title: '小说样式验收',
                source: 'local',
                chapters: [
                  { index: 0, title: '第一章', content: '普通阅读正文' },
                  { index: 1, title: '第二章', content: '后续阅读正文' },
                ],
              },
            ]),
          );
        }),
      );
      await page.goto('/reader');
      await page.getByRole('button', { name: '继续阅读', exact: true }).click();
      const reader = page.getByRole('region', { name: '阅读器', exact: true });
      const measure = () =>
        reader.evaluate((element) => {
          const { backgroundColor, color, borderRadius, fontFamily } = getComputedStyle(element);
          const header = element.querySelector('header')!;
          return [backgroundColor, color, borderRadius, fontFamily, getComputedStyle(header).color];
        });
      const before = await measure();
      await page.evaluate(() => {
        // Switch the underlying route without reloading the global reader host.
        history.pushState({}, '', '/chat/mini');
        dispatchEvent(new PopStateEvent('popstate'));
      });
      await expect(page.getByRole('combobox', { name: '小窗显示模式' })).toHaveText('Excel 模式');
      await expect(page.getByLabel('消息工作表列')).toBeVisible();
      expect(await measure()).toEqual(before);
      await navigationAboveChapter(reader);
      await page.screenshot({ path: testInfo.outputPath('reader-over-excel.png') });
      const next = reader.getByRole('button', { name: '下一章', exact: true });
      if (hasTouch) await next.tap();
      else {
        await reader.getByRole('region', { name: '章节正文' }).focus();
        await page.keyboard.press('ArrowRight');
      }
      await expect(reader.getByText('后续阅读正文')).toBeVisible();
      await expect(reader.getByRole('region', { name: '章节正文' })).toBeFocused();
    });
  }
