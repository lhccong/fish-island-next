import { expect, test } from '@playwright/test';
import { setupAdmin, adminMenu } from './admin-fixture';
test('legacy header sorting, equipment query expansion and wide table scrolling', async ({
  page,
  isMobile,
}) => {
  const state = await setupAdmin(page);
  await page.goto('/admin/user', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-admin-record]')).toHaveCount(1);
  if (!isMobile) {
    await page.setViewportSize({ width: 1536, height: 864 });
    expect(
      (await page.getByLabel('注册开始日期', { exact: true }).boundingBox())!.width,
    ).toBeGreaterThanOrEqual(120);
    await page.setViewportSize({ width: 1280, height: 720 });
  }
  const table = page.getByRole('region', { name: '管理表格横向滚动区' });
  if (!isMobile) {
    await table.hover();
    await page.mouse.wheel(500, 0);
    await expect.poll(() => table.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    await page.getByRole('button', { name: '按注册时间排序' }).click();
  } else {
    await page.getByRole('combobox', { name: '排序', exact: true }).click();
    await page.getByRole('option', { name: '创建时间', exact: true }).click();
    await page.getByRole('button', { name: '查询', exact: true }).click();
  }
  await expect
    .poll(() => state.requests.filter((r) => r.path === 'user/list/page').at(-1)?.body.sortField)
    .toBe('createTime');
  expect(state.requests.filter((r) => r.path === 'user/list/page').at(-1)?.body.sortOrder).toBe(
    isMobile ? 'descend' : 'ascend',
  );
  await adminMenu(page, '装备管理');
  await expect(page.getByRole('combobox', { name: '物品大类', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '展开', exact: true }).click();
  await page.getByRole('combobox', { name: '物品大类', exact: true }).click();
  await page.getByRole('option', { name: '材料', exact: true }).click();
  await page.getByRole('spinbutton', { name: '使用等级需求', exact: true }).fill('3');
  await page.getByRole('button', { name: '查询', exact: true }).click();
  await expect
    .poll(() => state.requests.filter((r) => r.path === 'itemTemplates/list/page/vo').at(-1)?.body)
    .toMatchObject({ category: 'material', levelReq: '3', current: 1 });
  await page.getByRole('button', { name: '收起', exact: true }).click();
  await page.getByRole('button', { name: '展开', exact: true }).click();
  await expect(page.getByRole('combobox', { name: '物品大类', exact: true })).toContainText('材料');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
