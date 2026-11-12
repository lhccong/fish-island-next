import { expect, test, type Page } from '@playwright/test';

const response = {
  code: 0,
  data: [
    {
      id: 'zhihu',
      name: '知乎热榜',
      categoryName: '综合资讯',
      updateTime: '2026-11-11 10:00',
      data: [
        { title: '城市周末生活指南', url: 'https://example.com/city', followerCount: 42 },
        {
          title: '这是一条用于验证手机端换行的长标题：一起发现身边值得关注的新鲜事与生活灵感',
          url: 'https://example.com/long',
          followerCount: 900,
        },
      ],
    },
    {
      id: 'weibo',
      name: '微博热搜',
      categoryName: '社交平台',
      data: [{ title: '今日公共话题', url: 'https://example.com/social' }],
    },
    { id: 'empty', name: '空榜来源', categoryName: '综合资讯', data: [] },
  ],
};

async function containedTheme(page: Page) {
  const trigger = page.getByRole('button', { name: '切换主题', exact: true });
  const box = await trigger.boundingBox();
  const parent = await trigger.locator('..').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(parent!.x);
  expect(box!.x + box!.width).toBeLessThanOrEqual(parent!.x + parent!.width);
  expect(box!.x + box!.width + 4).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '主题模式' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(trigger).toBeFocused();
}

test('WPS table searches, filters, sorts, refreshes and keeps the theme button inside', async ({
  page,
}, testInfo) => {
  const desktop = !testInfo.project.name.startsWith('mobile');
  const originalViewport = page.viewportSize()!;
  if (desktop) await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() => localStorage.setItem('fish-island:skin', 'wps'));
  let fail = false;
  let requests = 0;
  await page.route('**/api/hot/list', (route) => {
    requests++;
    return route.fulfill(fail ? { status: 503, body: 'unavailable' } : { json: response });
  });
  await page.goto('/');
  const table = page.getByRole('table', { name: '热榜数据' });
  await expect(table.getByRole('row')).toHaveCount(4);
  await expect(page.getByRole('complementary', { name: '热榜来源', exact: true })).toBeHidden();
  await expect(page.getByRole('link', { name: '城市周末生活指南', exact: true })).toHaveAttribute(
    'href',
    'https://example.com/city',
  );
  await expect(page.getByRole('link', { name: '城市周末生活指南', exact: true })).toHaveAttribute(
    'rel',
    'noopener noreferrer',
  );
  await containedTheme(page);
  await page.getByRole('button', { name: '按热度排序' }).click();
  await expect(table.locator('tbody tr').first()).toContainText('这是一条');
  await expect(table.locator('tbody tr').last()).toContainText('今日公共话题');
  await page.getByRole('button', { name: '按排名排序' }).click();
  await page.getByRole('combobox', { name: '筛选热榜来源' }).click();
  await page.getByRole('option', { name: '微博热搜', exact: true }).click();
  await expect(table.getByRole('row')).toHaveCount(2);
  await expect(table).toContainText('今日公共话题');
  await page.getByRole('combobox', { name: '筛选热榜来源' }).click();
  await page.getByRole('option', { name: '全部来源', exact: true }).click();
  await page.getByRole('combobox', { name: '筛选热榜分类' }).click();
  await page.getByRole('option', { name: '社交平台', exact: true }).click();
  await expect(table.getByRole('row')).toHaveCount(2);
  await page.getByRole('combobox', { name: '筛选热榜分类' }).click();
  await page.getByRole('option', { name: '全部分类', exact: true }).click();
  if (!desktop) await page.setViewportSize({ width: originalViewport.width, height: 540 });
  await page.getByRole('searchbox', { name: '查找热榜' }).fill('城市');
  await expect(table.getByRole('row')).toHaveCount(2);
  await page.getByRole('searchbox', { name: '查找热榜' }).fill('不存在的查询');
  await expect(page.getByRole('heading', { name: '没有找到相关内容' })).toBeVisible();
  await page.getByRole('button', { name: '清除筛选' }).click();
  await expect(table.getByRole('row')).toHaveCount(4);
  await page.getByRole('combobox', { name: '筛选热榜来源' }).click();
  await page.getByRole('option', { name: '空榜来源', exact: true }).click();
  await expect(page.getByRole('heading', { name: '该来源暂无内容' })).toBeVisible();
  await page.getByRole('button', { name: '清除筛选' }).click();
  fail = true;
  await page.getByRole('button', { name: '刷新', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('正在显示上次加载的内容');
  await expect(table.getByRole('row')).toHaveCount(4);
  fail = false;
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(requests).toBeGreaterThanOrEqual(3);
  if (!desktop) await page.setViewportSize(originalViewport);
  await containedTheme(page);
  await page.screenshot({ path: testInfo.outputPath('wps-hot-table.png'), fullPage: true });
  if (desktop) {
    await page.setViewportSize({ width: 1280, height: 800 });
    await containedTheme(page);
    await page.screenshot({ path: testInfo.outputPath('wps-hot-table-1280.png'), fullPage: true });
  }
});

for (const state of ['loading', 'empty', 'error'] as const) {
  test(`WPS table and theme remain usable with ${state} data`, async ({ page }, testInfo) => {
    await page.addInitScript(() => localStorage.setItem('fish-island:skin', 'wps'));
    await page.route('**/api/hot/list', (route) => {
      if (state === 'loading') return;
      return route.fulfill(
        state === 'error' ? { status: 503, body: 'unavailable' } : { json: { code: 0, data: [] } },
      );
    });
    await page.goto('/');
    await expect(page.getByRole('table', { name: '热榜数据' })).toBeVisible();
    if (state === 'loading') await expect(page.getByRole('status')).toContainText('正在获取');
    if (state === 'empty')
      await expect(page.getByRole('heading', { name: '暂时没有热榜内容' })).toBeVisible();
    if (state === 'error') await expect(page.getByRole('alert')).toBeVisible();
    await containedTheme(page);
    await page.screenshot({ path: testInfo.outputPath(`wps-table-${state}.png`), fullPage: true });
  });
}
