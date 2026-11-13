import { expect, type Page, type Locator } from '@playwright/test';

export async function setupRecordAvatars(page: Page) {
  await page.route('https://records.test/avatar.png', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><circle cx="18" cy="18" r="18" fill="#147a99"/></svg>',
    }),
  );
  await page.route('https://records.test/broken.png', (route) => route.abort());
}

export async function expectRecordAvatarsAndTitles(scroll: Locator) {
  await expect(scroll.getByRole('listitem').first()).toContainText('手气王');
  await expect(scroll.getByRole('listitem').last()).toContainText('倒霉王');
  await expect(scroll.getByText('手气王', { exact: true })).toHaveCount(1);
  await expect(scroll.getByText('倒霉王', { exact: true })).toHaveCount(1);
  await expect
    .poll(() =>
      scroll
        .getByRole('listitem')
        .first()
        .locator('img')
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(scroll.getByRole('listitem').nth(1).locator('img')).toHaveCount(0);
}
