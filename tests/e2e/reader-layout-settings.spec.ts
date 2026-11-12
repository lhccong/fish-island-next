import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

async function bottomAligned(reader: Locator) {
  const box = (await reader.boundingBox())!;
  const footer = (await reader
    .getByRole('button', { name: '下一章', exact: true })
    .locator('..')
    .boundingBox())!;
  expect(Math.abs(box.y + box.height - footer.y - footer.height)).toBeLessThanOrEqual(2);
}
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: chapter state footer and legacy reading settings`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(90_000);
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
          fail ? { status: 503, body: '{}' } : { json: { data: '第二章正文\n第二章测试文字。' } },
        );
      });
      await page.route('**/reader3/getChapterList*', (route) =>
        route.fulfill({ json: { data: [] } }),
      );
      await page.goto('/reader');
      await page.getByRole('button', { name: '继续阅读', exact: true }).click();
      const reader = page.getByRole('region', { name: '阅读器', exact: true, includeHidden: true });
      await expect(reader.getByText('第一章正文', { exact: true })).toBeVisible();
      await bottomAligned(reader);
      await reader.getByRole('button', { name: '下一章', exact: true }).click();
      await expect(reader.getByRole('status')).toContainText('正在加载章节');
      await bottomAligned(reader);
      await page.screenshot({ path: testInfo.outputPath('chapter-loading.png') });
      if (page.viewportSize()!.width > 760) {
        await reader.getByRole('button', { name: '切换全屏' }).click();
        await bottomAligned(reader);
        await reader.getByRole('button', { name: '切换全屏' }).click();
      }
      release();
      await expect(reader.getByRole('alert')).toContainText('503');
      await bottomAligned(reader);
      await page.screenshot({ path: testInfo.outputPath('chapter-error.png') });
      fail = false;
      await reader.getByRole('button', { name: '重试章节' }).click();
      await expect(reader.getByText('第二章正文', { exact: true })).toBeVisible();
      expect(indices).toEqual([2, 2]);
      await bottomAligned(reader);
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
      await bottomAligned(reader);
      await reader.getByRole('button', { name: '刷新阅读内容' }).click();
      await expect(reader.getByRole('heading', { name: '目录为空' })).toBeVisible();
      await bottomAligned(reader);
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
