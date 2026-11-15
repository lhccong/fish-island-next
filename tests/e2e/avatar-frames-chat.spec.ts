import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

for (const width of [1280, 375, 390]) {
  test.describe(`${width}px avatars`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: width < 760, hasTouch: width < 760 });
    for (const skin of builtinSkins)
      for (const mode of ['light', 'dark']) {
        test(`${skin.id} ${mode}: 消息和复读头像框`, async ({ page }, info) => {
          const fixture = await setupChatMenu(page, skin.id, mode);
          await page.route('https://frame.test/**', (route) =>
            route.fulfill({
              contentType: 'image/svg+xml',
              body: route.request().url().endsWith('/avatar.svg')
                ? '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#202020"/><circle cx="40" cy="40" r="22" fill="#f6bc96"/></svg>'
                : '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="25" fill="none" stroke="#d874ad" stroke-width="4"/></svg>',
            }),
          );
          for (const id of ['1', '2', '3'])
            fixture.broadcast({
              id,
              content: '头像框复读验证',
              timestamp: 1794700000000 + Number(id),
              sender: {
                id: `synthetic-${id}`,
                name: `岛友${id}`,
                avatar: 'https://frame.test/avatar.svg',
                avatarFramerUrl: 'https://frame.test/frame.svg',
              },
            });
          const people = page.getByRole('list', { name: '复读参与者' });
          await expect(people).toBeVisible();
          const frames = people.locator('[data-avatar-frame]');
          await expect(frames).toHaveCount(3);
          const dimensions = await frames.first().evaluate((e) => {
            const avatar = e.querySelector('[data-size="compact"]')!.getBoundingClientRect();
            const frame = e.querySelector(':scope > img')!.getBoundingClientRect();
            return {
              width: avatar.width,
              height: avatar.height,
              frame: frame.width,
              center: Math.abs(avatar.x + avatar.width / 2 - frame.x - frame.width / 2),
              round: getComputedStyle(e.firstElementChild!).borderRadius,
            };
          });
          expect(dimensions).toEqual({ width: 20, height: 20, frame: 32, center: 0, round: '50%' });
          const mainFrame = page.locator('[data-message-avatar] [data-avatar-frame]');
          const coverage = await mainFrame.evaluate((e) => {
            const avatar = e.firstElementChild!.getBoundingClientRect();
            const frame = e.querySelector(':scope > img')!.getBoundingClientRect();
            return {
              ratio: frame.width / avatar.width,
              center: Math.abs(avatar.x + avatar.width / 2 - frame.x - frame.width / 2),
              round: getComputedStyle(e.firstElementChild!).borderRadius,
            };
          });
          expect(coverage.ratio).toBeCloseTo(1.6, 2);
          expect(coverage.center).toBeLessThan(0.1);
          expect(coverage.round).toBe('50%');
          await page.screenshot({ path: info.outputPath('frame-coverage.png') });
          await expect(page.locator('[aria-label="聊天列表"] [data-avatar-frame]')).toHaveCount(0);
          await expect(page.locator('[data-message-avatar] [data-avatar-frame]')).toHaveCount(1);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
          expect(fixture.stats().connections).toBe(1);
        });
      }
  });
}
