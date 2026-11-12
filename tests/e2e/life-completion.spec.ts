import { expect, test } from '@playwright/test';

test('finishes a classic life and restores completed statistics after reload', async ({ page }) => {
  test.setTimeout(90_000);
  await page.route('**/api/**', (route) => route.abort());
  await page.clock.install();
  await page.goto('/game/life');
  await page.getByRole('button', { name: '立即重开', exact: true }).click();
  await page.getByRole('button', { name: /经典模式/ }).click();
  await page.evaluate(() => {
    let seed = 1;
    Math.random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  });
  await page.getByRole('button', { name: '十连抽', exact: true }).click();
  for (let i = 0; i < 3; i++) await page.locator('button[aria-pressed]').nth(i).click();
  await page.getByRole('button', { name: '分配属性', exact: true }).click();
  await page.getByRole('button', { name: '随机分配', exact: true }).click();
  await page.getByRole('button', { name: '开始新人生', exact: true }).click();
  await page.getByRole('radio', { name: '自动两倍速', exact: true }).check();
  const summary = page.getByRole('button', { name: '人生总结', exact: true });
  for (let i = 0; i < 30 && !(await summary.isVisible()); i++) await page.clock.runFor(5000);
  await summary.click();
  await expect(page.getByText(/总评/)).toBeVisible();
  await page.getByRole('button', { name: '再次重开', exact: true }).click();
  await expect(page.getByText('已重开 1 次')).toBeVisible();
  await page.reload();
  await expect(page.getByText('已重开 1 次')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
