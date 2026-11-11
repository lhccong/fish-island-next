import { expect, test } from '@playwright/test';

const response = {
  code: 0,
  data: [
    {
      id: '1',
      name: '知乎热榜',
      categoryName: '综合资讯',
      data: [{ title: '主题切换测试', url: 'https://example.com/topic' }],
    },
  ],
};

test('switches the workspace theme without losing content and restores after reload', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/hot/list', (route) => route.fulfill({ json: response }));
  await page.goto('/');
  await page.getByRole('button', { name: '查看知乎热榜消息' }).click();
  const input = page.getByRole('textbox', { name: '消息输入框', exact: true });
  await input.fill('切换主题时保留草稿');
  const trigger = page.getByRole('button', { name: '切换主题', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '主题模式' });
  await dialog.getByRole('button', { name: '企业微信', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'wecom');
  await expect(dialog.getByRole('button', { name: '企业微信' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.screenshot({ path: testInfo.outputPath('theme-picker.png'), fullPage: true });
  expect(
    await page
      .locator('html')
      .evaluate((root) => getComputedStyle(root).getPropertyValue('--color-accent').trim()),
  ).toBe('#2678df');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(input).toHaveValue('切换主题时保留草稿');
  await expect(page.getByRole('region', { name: '知乎热榜消息', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'wecom');
  await trigger.click();
  await dialog.getByRole('button', { name: '微信绿' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'wechat');
  expect(
    await page
      .locator('html')
      .evaluate((root) => getComputedStyle(root).getPropertyValue('--color-sidebar').trim()),
  ).toBe('#e8e8e8');
  await dialog.getByRole('button', { name: '企业微信' }).click();
  await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('wecom-workspace.png'), fullPage: true });
});

for (const state of ['loading', 'empty', 'error'] as const) {
  test(`theme entry stays usable with ${state} hot boards`, async ({ page }) => {
    await page.route('**/api/hot/list', async (route) => {
      if (state === 'loading') return;
      if (state === 'error') await route.fulfill({ status: 500, body: 'unavailable' });
      else await route.fulfill({ json: { code: 0, data: [] } });
    });
    await page.goto('/');
    if (state === 'loading') await expect(page.getByRole('status')).toContainText('正在获取');
    if (state === 'empty')
      await expect(page.getByText('暂时没有热榜内容', { exact: true })).toBeVisible();
    if (state === 'error') await expect(page.getByRole('alert')).toBeVisible();
    await page.getByRole('button', { name: '切换主题', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '主题模式' });
    await dialog.getByRole('button', { name: '企业微信' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', 'wecom');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  });
}
