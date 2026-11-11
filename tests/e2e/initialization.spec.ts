import { expect, test } from '@playwright/test';

test('switches appearance and restores dialog focus', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('轻盈的聊天体验');
  await page.getByRole('button', { name: '飞书蓝' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'feishu');
  expect(
    await page
      .locator('html')
      .evaluate((root) => getComputedStyle(root).getPropertyValue('--color-accent').trim()),
  ).toBe('#315bd6');
  await expect(page.getByRole('button', { name: '飞书蓝' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: '微信绿' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  const trigger = page.getByRole('button', { name: '查看开发约定' });
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('initialization.png'), fullPage: true });
});
