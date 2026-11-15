import { expect, test } from '@playwright/test';
import { setupAdmin } from './admin-fixture';
test('changing own administrator role immediately removes access', async ({ page }) => {
  const state = await setupAdmin(page);
  state.self = true;
  await page.goto('/admin/user', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '修改', exact: true }).click();
  const d = page.getByRole('dialog');
  await d.getByRole('combobox', { name: '角色', exact: true }).click();
  await page.getByRole('option', { name: '普通用户', exact: true }).click();
  await d.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('仅管理员');
  await expect(page.getByRole('link', { name: '管理页', exact: true })).toHaveCount(0);
  expect(state.role).toBe('user');
});
test('revoked server permission refreshes role without a request loop', async ({ page }) => {
  const state = await setupAdmin(page);
  await page.goto('/admin/title', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-admin-record]')).toHaveCount(1);
  state.role = 'user';
  let denied = 0;
  await page.route('**/api/user/title/list/page', (r) => {
    denied++;
    return r.fulfill({ json: { code: 40101, message: '无权限' } });
  });
  await page.getByRole('button', { name: '刷新', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('仅管理员');
  expect(denied).toBe(1);
  await expect(page.getByRole('link', { name: '管理页', exact: true })).toHaveCount(0);
});
