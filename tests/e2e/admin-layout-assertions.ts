import { expect, type Page } from '@playwright/test';
export const legacyHeaders: Record<string, string[]> = {
  '/admin/user': ['id', '账号', '用户名', '头像', '简介', '权限', '注册时间', '更新时间', '操作'],
  '/admin/title': ['ID', '称号名称', '创建时间', '更新时间', '操作'],
  '/admin/tags': ['id', '标签名称', '颜色', '图标', '类型', '排序', '操作'],
  '/admin/word/library': ['id', '单词', '分类', '类型', '创建时间', '更新时间', '操作'],
  '/admin/game/itemTemplates': [
    '物品名称',
    '物品大类',
    '物品子类型',
    '可穿戴槽位',
    '物品图标',
    '稀有度',
    '操作',
  ],
  '/admin/report': [
    'ID',
    '举报类型',
    '举报原因',
    '举报人',
    '被举报用户',
    '被举报对象ID',
    '补充说明',
    '聊天内容',
    '处理状态',
    '创建时间',
    '处理时间',
    '处理备注',
    '操作',
  ],
};
export async function assertLegacyLayout(page: Page, path: string, mobile: boolean) {
  if (path === '/admin/data') {
    const stats = page.locator('[data-admin-statistics]');
    await expect(stats).toBeVisible();
    const cards = await stats.getByRole('button').all();
    expect(cards).toHaveLength(4);
    const bounds = await Promise.all(cards.map((card) => card.boundingBox()));
    if (!mobile) expect(new Set(bounds.map((b) => Math.round(b!.y))).size).toBe(1);
    const chart = page.locator('[data-admin-trend]');
    expect((await chart.boundingBox())!.y).toBeGreaterThan((await stats.boundingBox())!.y);
    await expect(chart.getByRole('group', { name: '统计周期' }).getByRole('button')).toHaveText([
      '本周',
      '本月',
      '今年',
    ]);
    return;
  }
  const table = page.getByRole('table', { name: '管理记录', exact: true });
  await expect(table.getByRole('columnheader')).toHaveText(legacyHeaders[path]!);
  const query = page.getByRole('form', { name: '管理查询' });
  const toolbar = page
    .getByRole('heading', { level: 2 })
    .filter({ hasText: /查询表格|称号管理|词库管理|举报管理/ });
  const queryBox = (await query.boundingBox())!;
  const toolbarBox = (await toolbar.boundingBox())!;
  expect(toolbarBox.y).toBeGreaterThanOrEqual(queryBox.y + queryBox.height);
  const viewport = page.getByRole('region', { name: '管理表格横向滚动区' });
  if (mobile) expect(await viewport.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  else {
    expect(await table.evaluate((el) => getComputedStyle(el).display)).toBe('table');
    const last = table.getByRole('columnheader').last();
    const first = table.getByRole('columnheader').first();
    expect(Math.abs((await first.boundingBox())!.y - (await last.boundingBox())!.y)).toBeLessThan(
      1,
    );
  }
}
