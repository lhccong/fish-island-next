import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setup } from './fish-circle-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: complete reading flow and states`, async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skin: skin.id, mode },
      );
      await page.route('**/api/**', (route) => route.abort());
      let searchState = 'error';
      let contentRequests = 0;
      let firstSearch = true;
      let releaseSearch!: () => void;
      const searchGate = new Promise<void>((resolve) => {
        releaseSearch = resolve;
      });
      page.once('close', () => releaseSearch());
      let chapterStage = 'empty';
      let contentFailure = true;
      let releaseChapters!: () => void;
      const chapterGate = new Promise<void>((resolve) => {
        releaseChapters = resolve;
      });
      await page.route('**/reader3/searchBookMultiSSE*', async (route) => {
        expect(
          new URL(route.request().url()).searchParams.get('accessToken') ===
            'synthetic-reader-default',
        ).toBe(true);
        if (firstSearch) {
          firstSearch = false;
          await searchGate;
        }
        if (searchState === 'error') {
          await route.fulfill({ status: 503, body: '{}' });
          return;
        }
        const data =
          searchState === 'empty'
            ? []
            : [
                {
                  bookUrl: 'https://fiction.example/book',
                  origin: 'https://source.example',
                  originName: '合成书源',
                  name: '迁移验收书',
                  author: '测试作者',
                  intro: '合成数据，仅用于测试',
                },
              ];
        await route.fulfill({
          contentType: 'text/event-stream',
          body: `data: ${JSON.stringify({ data, lastIndex: 1 })}\n\nevent: end\ndata: {"isEnd":false,"lastIndex":1}\n\n`,
        });
      });
      await page.route('**/reader3/getChapterList*', async (route) => {
        expect(
          new URL(route.request().url()).searchParams.get('accessToken') ===
            'synthetic-reader-default',
        ).toBe(true);
        await chapterGate;
        if (chapterStage === 'error') {
          await route.fulfill({ status: 503, body: '{}' });
          return;
        }
        if (chapterStage === 'empty') {
          await route.fulfill({ json: { data: [] } });
          return;
        }
        await route.fulfill({
          json: {
            data: [
              { index: 0, title: '第一章 起点', isVolume: false },
              { index: 1, title: '第二卷', isVolume: true },
              { index: 2, title: '第二章 远行', isVolume: false },
            ],
          },
        });
      });
      await page.route('**/reader3/getBookContent*', async (route) => {
        expect(
          new URL(route.request().url()).searchParams.get('accessToken') ===
            'synthetic-reader-default',
        ).toBe(true);
        contentRequests++;
        if (contentFailure) {
          await route.fulfill({ status: 503, body: '{}' });
          return;
        }
        const body = route.request().postDataJSON() as { index: number };
        await route.fulfill({
          json: {
            data: `${body.index === 0 ? '起点正文' : '远行正文'}\n${Array.from({ length: 70 }, (_, index) => `第${index + 1}段：这是合成阅读验收文字，检查手机排版和进度恢复。`).join('\n')}\n<script>throw new Error("unsafe")</script>`,
          },
        });
      });
      await setup(page);
      const discovery =
        page.viewportSize()!.width <= 760
          ? page.getByRole('navigation', { name: '发现菜单' }).filter({ visible: true })
          : page.getByRole('complementary', { name: '鱼小圈导航', exact: true });
      await discovery.getByRole('link', { name: '阅读', exact: true }).click();
      await expect(page).toHaveURL('/reader');
      await expect(page.getByRole('heading', { name: '书架还是空的' })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath('empty.png') });
      await page.getByRole('button', { name: '添加第一本书' }).click();
      const add = page.getByRole('dialog', { name: '添加书籍' });
      await add.getByRole('textbox', { name: '书名或作者' }).fill('迁移');
      await add.getByRole('button', { name: '搜索', exact: true }).click();
      await expect(add.getByText('正在搜索书源…')).toBeVisible();
      releaseSearch();
      await expect(add.getByRole('alert')).toContainText('503');
      await page.screenshot({ path: testInfo.outputPath('error.png') });
      searchState = 'empty';
      await add.getByRole('button', { name: '重试搜索' }).click();
      await expect(add.getByText('没有找到相关书籍')).toBeVisible();
      searchState = 'ready';
      await add.getByRole('button', { name: '搜索', exact: true }).click();
      await add.getByRole('button', { name: '加入书架' }).click();
      await expect(add.getByRole('button', { name: '已在书架' })).toBeDisabled();
      await add.getByRole('button', { name: '加载更多' }).click();
      await expect(add.getByRole('heading', { name: '迁移验收书' })).toHaveCount(1);
      await add.getByRole('button', { name: '关闭', exact: true }).click();
      await page.getByRole('button', { name: '阅读《迁移验收书》' }).click();
      const reader = page.getByRole('region', { name: '阅读器', exact: true });
      await expect(reader.getByText('正在加载章节…')).toBeVisible();
      releaseChapters();
      await expect(reader.getByRole('heading', { name: '目录为空' })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath('reader-empty.png') });
      chapterStage = 'error';
      await reader.getByRole('button', { name: '刷新阅读内容' }).click();
      await expect(reader.getByRole('alert')).toContainText('503');
      await page.screenshot({ path: testInfo.outputPath('reader-error.png') });
      chapterStage = 'ready';
      await reader.getByRole('button', { name: '重试章节' }).click();
      await expect.poll(() => contentRequests).toBe(1);
      await expect(reader.getByRole('alert')).toContainText('503');
      contentFailure = false;
      await reader.getByRole('button', { name: '重试章节' }).click();
      await expect(reader.getByText('起点正文', { exact: true })).toBeVisible();
      await expect(reader.getByRole('button', { name: '上一章', exact: true })).toBeDisabled();
      await reader.getByRole('button', { name: '下一章', exact: true }).click();
      await expect(reader.getByText('远行正文', { exact: true })).toBeVisible();
      await reader.getByRole('button', { name: '章节目录', exact: true }).click();
      const contents = page.getByRole('dialog', { name: '《迁移验收书》目录' });
      await contents.getByRole('textbox', { name: '筛选章节' }).fill('第一章');
      await contents.getByRole('button', { name: '第一章 起点', exact: true }).click();
      await expect(reader.getByText('起点正文', { exact: true })).toBeVisible();
      await reader.getByRole('button', { name: '阅读器设置' }).click();
      const settings = page.getByRole('dialog', { name: '阅读设置', exact: true });
      await settings.getByRole('combobox', { name: '阅读主题' }).click();
      await page.getByRole('option', { name: '纸张', exact: true }).click();
      await settings.getByLabel('字号', { exact: true }).fill('21');
      await page.screenshot({ path: testInfo.outputPath('settings.png') });
      await settings.getByRole('button', { name: '关闭阅读设置', exact: true }).click();
      await expect(reader).toBeVisible();
      await expect(reader.getByRole('button', { name: '阅读器设置' })).toBeFocused();
      await reader.getByRole('textbox', { name: '当前章节搜索' }).fill('第30段');
      await expect(reader.getByText('1 处', { exact: true })).toBeVisible();
      await reader.getByRole('button', { name: '下处', exact: true }).click();
      await reader.getByRole('textbox', { name: '当前章节搜索' }).fill('');
      await page.screenshot({ path: testInfo.outputPath('reading.png') });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const requestsBefore = contentRequests;
      await reader.getByRole('button', { name: '紧急隐藏' }).click();
      await expect(reader).toHaveCount(0);
      await page.getByRole('button', { name: '切换主题', exact: true }).click();
      const appearance = page.getByRole('dialog', { name: '主题模式' });
      await appearance
        .getByRole('button', { name: skin.id === 'wps' ? '微信绿' : 'WPS 表格', exact: true })
        .click();
      await appearance.getByRole('button', { name: skin.name, exact: true }).click();
      await appearance.getByRole('button', { name: '关闭', exact: true }).click();
      await page.getByRole('button', { name: '恢复阅读窗口', exact: true }).click();
      await expect(reader.getByText('起点正文', { exact: true })).toBeAttached();
      expect(contentRequests).toBe(requestsBefore);
      await reader.getByRole('button', { name: '关闭阅读器', exact: true }).click();
      await page.reload();
      await page.getByRole('button', { name: '继续阅读', exact: true }).click();
      await expect(reader.getByText('起点正文', { exact: true })).toBeAttached();
      expect(contentRequests).toBe(requestsBefore);
      await reader.getByRole('button', { name: '关闭阅读器', exact: true }).click();
      await page.getByRole('button', { name: '删除《迁移验收书》', exact: true }).click();
      await page
        .getByRole('dialog', { name: '删除书籍' })
        .getByRole('button', { name: '确认删除' })
        .click();
      await expect(page.getByRole('heading', { name: '书架还是空的' })).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

test('TXT import, directory entry, progress, global navigation and unsupported PiP', async ({
  page,
}) => {
  await page.route('**/api/**', (route) => route.abort());
  await page.addInitScript(() => {
    Object.defineProperty(window, 'documentPictureInPicture', {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto('/reader');
  await page.getByRole('button', { name: '添加第一本书' }).click();
  const text = `第一章 开始\n${Array.from({ length: 100 }, (_, index) => `合成段落 ${index}：导入与进度验证。`).join('\n')}\n第二章 继续\n另一章正文`;
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: '本地验收.txt', mimeType: 'text/plain', buffer: Buffer.from(text) });
  await page.getByRole('button', { name: '《本地验收》目录', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '《本地验收》目录' })).toBeVisible();
  await page
    .getByRole('dialog', { name: '《本地验收》目录' })
    .getByRole('button', { name: '关闭', exact: true })
    .click();
  const reader = page.getByRole('region', { name: '阅读器', exact: true });
  const viewport = reader.getByRole('region', { name: '章节正文', exact: true });
  await viewport.evaluate((element) => {
    element.scrollTop = 850;
    element.dispatchEvent(new Event('scroll'));
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('fish-island:reader:v1')!).books[0].lastReadPosition,
      ),
    )
    .toBeGreaterThan(500);
  await reader.getByRole('button', { name: '画中画', exact: true }).click();
  await expect(reader.getByRole('status')).toContainText(/画中画.*失败|不支持/);
  await reader.getByRole('button', { name: '紧急隐藏' }).click();
  await page
    .getByRole('navigation', { name: '发现菜单' })
    .filter({ visible: true })
    .getByRole('link', { name: '游戏', exact: true })
    .click();
  await expect(page).toHaveURL(/discover\/games/);
  await page.getByRole('button', { name: '恢复阅读窗口', exact: true }).click();
  await expect(viewport).toBeVisible();
  expect(await viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(500);
});
