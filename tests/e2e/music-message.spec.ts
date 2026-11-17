import { musicViewports } from './music-viewports';
import { expect, test } from '@playwright/test';
import { encodeMusicMessage } from '../../src/domain/chat';
import { builtinSkins } from '../../src/skins/builtin';
import { setupMusic, releaseMusicFixture } from './music-fixture';
test.afterEach(async ({ page }) => releaseMusicFixture(page));

musicViewports(() => {
  for (const skin of builtinSkins)
    for (const mode of ['light', 'dark'])
      test(`${skin.id} ${mode}: received music starts a cold player and orb supports drag, keyboard and stop`, async ({
        page,
      }, info) => {
        const fixture = await setupMusic(page, skin.id, mode);
        fixture.holdResolution(true);
        fixture.push(
          '9001',
          encodeMusicMessage({
            id: 'cold',
            source: 'tencent',
            name: '收到的合成歌曲',
            artist: '合成歌手',
          }),
        );
        await expect(page.locator('audio')).toHaveCount(0);
        const disc = page.locator('[data-message-id="9001"] [data-media-disc]');
        await expect(disc).toHaveCSS('border-radius', '50%');
        const discBox = (await disc.boundingBox())!;
        expect(discBox.width).toBe(discBox.height);
        await expect(page.locator('[data-message-id="9001"] [data-music-only="true"]')).toHaveCSS(
          'background-color',
          'rgba(0, 0, 0, 0)',
        );
        await page.getByRole('button', { name: '播放音乐 收到的合成歌曲', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: '音乐', exact: true });
        await expect(dialog.getByRole('status').filter({ hasText: '正在加载歌曲' })).toBeVisible();
        fixture.holdResolution(false);
        await expect(dialog.getByRole('button', { name: '暂停音乐', exact: true })).toBeVisible();
        await dialog.getByRole('button', { name: '关闭音乐', exact: true }).click();
        const orb = page.getByRole('button', { name: '音乐悬浮球', exact: true });
        await expect(orb).toBeVisible();
        await expect
          .poll(() => page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.paused))
          .toBe(false);
        expect(fixture.counts()).toEqual({ searchRequests: 0, resolveRequests: 1 });
        const before = (await orb.boundingBox())!;
        await orb.focus();
        await orb.press('ArrowLeft');
        expect((await orb.boundingBox())!.x).toBeLessThan(before.x);
        if (page.viewportSize()!.width > 760) {
          const box = (await orb.boundingBox())!;
          await page.mouse.move(box.x + 32, box.y + 32);
          await page.mouse.down();
          await page.mouse.move(box.x - 80, box.y + 100, { steps: 6 });
          await page.mouse.up();
        } else {
          const touch = await page.context().newCDPSession(page);
          const box = (await orb.boundingBox())!;
          await touch.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x: box.x + 32, y: box.y + 32 }],
          });
          for (let step = 1; step <= 6; step++)
            await touch.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x: box.x + 32 - step * 15, y: box.y + 32 + step * 10 }],
            });
          await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await touch.detach();
        }
        await expect(page.getByRole('dialog', { name: '音乐悬浮播放', exact: true })).toHaveCount(
          0,
        );
        const box = (await orb.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
        await orb.click();
        const floating = page.getByRole('dialog', { name: '音乐悬浮播放', exact: true });
        await floating.getByRole('button', { name: '悬浮球暂停音乐' }).click();
        await expect(floating.getByRole('button', { name: '悬浮球播放音乐' })).toBeVisible();
        await floating.getByRole('button', { name: '悬浮球播放音乐' }).click();
        await page.screenshot({ path: info.outputPath('music-message-orb.png') });
        await floating.getByRole('button', { name: '停止并关闭', exact: true }).click();
        await expect(orb).toHaveCount(0);
        expect(
          await page
            .locator('audio')
            .evaluate((audio: HTMLAudioElement) => audio.paused && !audio.getAttribute('src')),
        ).toBe(true);
      });
});
