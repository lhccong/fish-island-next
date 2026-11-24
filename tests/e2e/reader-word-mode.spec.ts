import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

import { scrollChapter } from './reader-scroll-fixture';

function readingPosition(viewport: Locator) {
  return viewport.evaluate((element) => {
    const top = element.getBoundingClientRect().top;
    return Array.from(element.querySelectorAll('[data-paragraph]')).findIndex(
      (paragraph) => paragraph.getBoundingClientRect().bottom > top,
    );
  });
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: 旧版 Word 阅读和章节状态`, async ({ page }, testInfo) => {
      test.setTimeout(60_000);
      const touch = testInfo.project.use.hasTouch === true;
      const press = (button: Locator) => (touch ? button.tap() : button.click());
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
          localStorage.setItem(
            'fish-reader-settings',
            JSON.stringify({ apiBaseUrl: 'https://reader.test/reader3' }),
          );
          localStorage.setItem(
            'fish-reader-books',
            JSON.stringify([
              {
                id: 'word-mode-book',
                title: '文档阅读验收',
                url: 'https://reader.test/book',
                source: 'online',
                chapters: [
                  {
                    index: 0,
                    title: '第一章',
                    content: Array.from(
                      { length: 100 },
                      (_, index) => `验收段落 ${index + 1}。正文滚动及阅读进度使用合成文本。`,
                    ).join('\n'),
                  },
                  { index: 1, title: '分卷标题', isVolume: true },
                  { index: 2, title: '第二章' },
                  { index: 3, title: '第三章' },
                ],
              },
            ]),
          );
        },
        { skin: skin.id, mode },
      );
      await page.route('**/api/**', (route) => route.abort());
      let release!: () => void;
      const loading = new Promise<void>((resolve) => {
        release = resolve;
      });
      page.once('close', release);
      const requests: number[] = [];
      await page.route('**/reader3/getBookContent*', async (route) => {
        const { index } = route.request().postDataJSON() as { index: number };
        requests.push(index);
        if (requests.length === 1) {
          await loading;
          await route.fulfill({ status: 503, body: '{}' });
        } else {
          await route.fulfill({ json: { data: index === 2 ? '第二章正文' : '\n' } });
        }
      });

      await page.goto('/reader', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
      await press(page.getByRole('button', { name: '继续阅读', exact: true }));
      const reader = page.getByRole('region', { name: '阅读器', exact: true });
      const entry = reader.getByRole('button', { name: 'Word模式', exact: true });
      await expect(reader.getByRole('button', { name: '工作伪装' })).toHaveCount(0);
      const search = reader.getByRole('textbox', { name: '当前章节搜索' });
      await press(reader.getByRole('button', { name: '搜索当前章节', exact: true }));
      await expect(search).toBeFocused();
      await expect(search).toHaveCSS('outline-style', 'none');
      await search.fill('验收');
      await search.blur();
      const normalViewport = reader.getByRole('region', { name: '章节正文', exact: true });
      await scrollChapter(page, normalViewport, touch);
      await expect.poll(() => readingPosition(normalViewport)).toBeGreaterThan(0);
      const originalPosition = await readingPosition(normalViewport);

      await press(entry);
      const word = page.getByRole('dialog', { name: 'Word模式', exact: true });
      const exit = word.getByRole('button', { name: '退出Word模式', exact: true });
      const previous = word.getByRole('button', { name: '上一章', exact: true });
      const next = word.getByRole('button', { name: '下一章', exact: true });
      const viewport = word.getByRole('region', { name: '章节正文', exact: true });
      await expect(exit).toBeFocused();
      await expect(exit).toHaveCSS('outline-style', 'none');
      await expect(word.getByRole('heading', { name: '第一章' })).toBeAttached();
      await expect(word.getByRole('link', { name: 'QQ阅读首页' })).toHaveAttribute(
        'href',
        'https://book.qq.com',
      );
      await expect(search).toBeHidden();
      await expect(previous).toBeDisabled();
      expect(requests).toEqual([]);
      expect(Math.abs((await readingPosition(viewport)) - originalPosition)).toBeLessThan(4);

      await page.keyboard.press('Tab');
      await expect(viewport).toBeFocused();
      await expect(viewport).toHaveCSS('outline-style', 'solid');
      await press(viewport);
      await expect(viewport).toBeFocused();
      await expect(viewport).toHaveCSS('outline-style', 'none');
      const scrollTop = () => viewport.evaluate((element) => element.scrollTop);
      const beforeKeyScroll = await scrollTop();
      await page.keyboard.press('ArrowDown');
      await expect.poll(scrollTop).toBeGreaterThan(beforeKeyScroll);
      await expect(viewport).toHaveCSS('outline-style', 'solid');

      const measurement = await viewport.evaluate((element) => {
        const page = element.querySelector('h2')!.parentElement!;
        const scrollbar = element.parentElement!.querySelector('[data-orientation="vertical"]')!;
        return {
          paper: getComputedStyle(page).backgroundColor,
          workspace: getComputedStyle(document.querySelector('dialog[open]')!).backgroundColor,
          gutter: parseInt(getComputedStyle(element).paddingInlineEnd, 10),
          paperGap: element.getBoundingClientRect().right - page.getBoundingClientRect().right,
          overflow: element.scrollWidth - element.clientWidth,
          scrollbar: getComputedStyle(scrollbar).visibility,
        };
      });
      expect(measurement.workspace).toBe(
        mode === 'dark' ? 'rgb(25, 26, 28)' : 'rgb(230, 230, 230)',
      );
      expect(measurement.paper === 'rgb(255, 255, 255)').toBe(mode === 'light');
      expect(measurement.gutter).toBe(touch ? 20 : 24);
      expect(measurement.paperGap).toBeGreaterThanOrEqual(measurement.gutter);
      expect(measurement.overflow).toBeLessThanOrEqual(1);
      expect(measurement.scrollbar).toBe(touch ? 'hidden' : 'visible');
      if (touch) {
        for (const button of [exit, next])
          expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      } else {
        await expect
          .poll(() =>
            viewport.evaluate((element) =>
              Number(
                getComputedStyle(
                  element.parentElement!.querySelector('[data-orientation="vertical"]')!,
                ).opacity,
              ),
            ),
          )
          .toBe(1);
      }

      await scrollChapter(page, viewport, touch);
      await expect.poll(() => readingPosition(viewport)).toBeGreaterThan(originalPosition + 1);
      if (process.env.READER_WORD_SCREENSHOTS && skin.id === 'moyu-island') {
        await press(viewport);
        await page.screenshot({ path: testInfo.outputPath('word-mode.png') });
      }
      const wordPosition = await readingPosition(viewport);
      if (touch) await press(exit);
      else await page.keyboard.press('Escape');
      await expect(word).toHaveCount(0);
      await expect(entry).toBeFocused();
      await expect(search).toHaveValue('验收');
      expect(Math.abs((await readingPosition(normalViewport)) - wordPosition)).toBeLessThan(4);

      await press(entry);
      if (touch) await press(next);
      else await page.keyboard.press('ArrowRight');
      await expect(word.getByRole('status')).toContainText('正在加载章节');
      await expect(next).toBeDisabled();
      await expect(exit).toBeVisible();
      await expect(word.locator('[tabindex="-1"]')).toHaveCSS(
        'outline-style',
        touch ? 'none' : 'solid',
      );
      release();
      await expect(word.getByRole('alert')).toContainText('503');
      await press(word.getByRole('button', { name: '重试章节' }));
      await expect(word.getByRole('heading', { name: '第二章' })).toBeVisible();
      await expect(viewport.getByText('第二章正文')).toBeVisible();
      await expect(viewport).toBeFocused();
      await expect(viewport).toHaveCSS('outline-style', 'none');
      await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBe(0);
      expect(requests).toEqual([2, 2]);
      await press(next);
      await expect(viewport.getByText('暂无正文，请刷新目录或重试。')).toBeVisible();
      await expect(next).toBeDisabled();
      await press(previous);
      await expect(viewport.getByText('第二章正文')).toBeVisible();
      expect(requests).toEqual([2, 2, 3]);
      await press(exit);
      await expect(reader.getByRole('heading', { name: '第二章' })).toBeVisible();
      await expect(entry).toBeFocused();
      await press(reader.getByRole('button', { name: '关闭阅读器', exact: true }));
      await expect(page.getByRole('button', { name: '继续阅读', exact: true })).toBeVisible();
    });
  }

test('1920px 桌面按照旧版截图排列标题栏、功能区、纸面和状态栏', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', '宽屏截图仅在桌面验收');
  await page.setViewportSize({ width: 1920, height: 911 });
  await page.route('**/api/**', (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('fish-island:color-mode', 'light');
    localStorage.setItem('fish-island:skin', 'moyu-island');
    localStorage.setItem(
      'fish-reader-books',
      JSON.stringify([
        {
          id: 'word-layout',
          title: '文档样式验收',
          source: 'local',
          chapters: [
            {
              index: 0,
              title: '第一卷 远山 第一章 晨光',
              content: [
                '山间的晨光透过云层。',
                ...Array.from(
                  { length: 30 },
                  () =>
                    '山间的晨光透过云层，洒在连绵的田野上。小路沿着溪水伸向远方，沿途的树叶还挂着昨夜的露珠。远处的村庄渐渐热闹起来，薄雾在屋檐间缓缓散开。',
                ),
              ].join('\n'),
            },
          ],
        },
      ]),
    );
  });
  await page.goto('/reader', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '继续阅读', exact: true }).click();
  await page.getByRole('button', { name: 'Word模式', exact: true }).click();
  const word = page.getByRole('dialog', { name: 'Word模式', exact: true });
  const heading = word.getByRole('heading', { name: '第一卷 远山 第一章 晨光' });
  await expect(heading).toBeVisible();
  const header = await word.locator('header:visible').boundingBox();
  expect(header).toMatchObject({ x: 0, y: 0, width: 1905, height: 185 });
  const pageBox = await heading.locator('..').boundingBox();
  expect(pageBox).toMatchObject({ y: 225, width: 900 });
  expect(pageBox!.x).toBeCloseTo(494.5, 0);
  await expect(heading).toHaveCSS('border-bottom-style', 'dashed');
  await expect(heading).toHaveCSS('text-align', 'center');
  await expect(word.locator('[data-paragraph="0"]')).toHaveCSS('text-indent', '32px');
  await expect(word.getByText('第 1 章，共 1 章')).toBeVisible();
  await expect(word.getByText(/\d+ 个字/)).toBeVisible();
  const next = word.getByRole('button', { name: '下一章', exact: true });
  const nextBox = (await next.boundingBox())!;
  expect(nextBox.y + nextBox.height).toBe(911);
  if (process.env.READER_WORD_SCREENSHOTS)
    await page.screenshot({ path: testInfo.outputPath('word-wide-reference.png') });
});

test('画中画请求完成时，已打开的 Word 模式继续显示本地 TXT 正文', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', '文档画中画仅在桌面验收');
  await page.route('**/api/**', (route) => route.abort());
  await page.addInitScript(() => {
    Object.defineProperty(window, 'documentPictureInPicture', {
      value: {
        requestWindow: () =>
          new Promise((resolve) => {
            window.addEventListener(
              'finish-test-pip',
              () => resolve({ close: () => (document.body.dataset.testPipClosed = 'true') }),
              { once: true },
            );
          }),
      },
    });
  });
  await page.goto('/reader', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '添加第一本书' }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: '本地Word验收.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('第一章 开始\n本地 TXT 正文\n第二章 内容\n本地第二章正文'),
  });
  await page.getByRole('button', { name: '继续阅读', exact: true }).click();
  const reader = page.getByRole('region', { name: '阅读器', exact: true });
  await reader.getByRole('button', { name: '画中画', exact: true }).click();
  await reader.getByRole('button', { name: 'Word模式', exact: true }).click();
  const word = page.getByRole('dialog', { name: 'Word模式', exact: true });
  await page.evaluate(() => window.dispatchEvent(new Event('finish-test-pip')));
  await expect(page.locator('body')).toHaveAttribute('data-test-pip-closed', 'true');
  await expect(word.getByText('本地 TXT 正文', { exact: true })).toBeVisible();
  await word.getByRole('button', { name: '下一章', exact: true }).click();
  await expect(word.getByText('本地第二章正文', { exact: true })).toBeVisible();
  await word.getByRole('button', { name: '退出Word模式', exact: true }).click();
  await expect(reader.getByText('本地第二章正文', { exact: true })).toBeVisible();
});
