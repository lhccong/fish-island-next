import { expect, test, type Locator, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { releaseMusicFixture, setupMusic } from './music-fixture';
import { musicViewports } from './music-viewports';

test.afterEach(async ({ page }) => releaseMusicFixture(page));

async function swipeList(page: Page, list: Locator) {
  const box = (await list.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height * 0.8;
  const touch = await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 6; step++) {
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y - step * 18 }],
    });
    await page.evaluate(() => new Promise(requestAnimationFrame));
  }
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await touch.detach();
}

musicViewports(() => {
  for (const skin of builtinSkins)
    for (const mode of ['light', 'dark']) {
      test(`${skin.id} ${mode}: daily songs load, recover, scroll, play and share`, async ({
        page,
      }, info) => {
        const mobile = page.viewportSize()!.width < 760;
        const activate = (button: Locator) => (mobile ? button.tap() : button.click());
        const fixture = await setupMusic(page, skin.id, mode);
        const dialog = await fixture.open();
        const daily = dialog.getByRole('button', { name: '每日30首', exact: true });
        const fm = dialog.getByRole('button', { name: '今日推荐', exact: true });
        expect(fixture.dailyRequests()).toBe(0);
        expect((await daily.boundingBox())!.height).toBeGreaterThanOrEqual(mobile ? 44 : 32);
        expect((await daily.boundingBox())!.x).toBeLessThan((await fm.boundingBox())!.x);
        fixture.phase('loading');
        await activate(daily);
        const list = dialog.getByRole('region', { name: '每日30首歌曲', exact: true });
        await expect(daily).toHaveAttribute('aria-pressed', 'true');
        await expect(list.getByRole('status')).toContainText('正在加载每日30首');
        await expect.poll(() => fixture.dailyRequests()).toBe(1);
        fixture.phase('empty');
        await expect(list.getByText('今天暂无歌曲')).toBeVisible();
        fixture.phase('error');
        await activate(list.getByRole('button', { name: '重试', exact: true }));
        await expect(list.getByRole('alert')).toContainText('后端 yml');
        fixture.phase('success');
        await activate(list.getByRole('button', { name: '重试', exact: true }));
        await expect(list.getByRole('button', { name: /^点歌 合成歌曲/ })).toHaveCount(30);
        const first = list.getByRole('button', { name: '点歌 合成歌曲1', exact: true });
        const last = list.getByRole('button', { name: '点歌 合成歌曲30', exact: true });
        await first.focus();
        await expect(first).toBeInViewport();
        await activate(first);
        await expect(dialog.getByRole('button', { name: '暂停音乐', exact: true })).toBeVisible();
        if (mobile) await swipeList(page, list);
        else {
          await list.hover();
          await page.mouse.wheel(0, 180);
        }
        await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
        await list.press('End');
        await expect(last).toBeInViewport();
        await last.focus();
        await expect(last).toBeFocused();
        const layout = await list.evaluate((element) => {
          const track = element.parentElement!.querySelector('[data-orientation="vertical"]')!;
          return {
            gutter: parseFloat(getComputedStyle(element).paddingRight),
            track: getComputedStyle(track).visibility,
            overflow: element.scrollWidth > element.clientWidth,
          };
        });
        expect(layout).toEqual({
          gutter: mobile ? 20 : 24,
          track: mobile ? 'hidden' : 'visible',
          overflow: false,
        });
        expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
          true,
        );
        await activate(last);
        await expect(dialog.getByRole('button', { name: '待播 1', exact: true })).toBeVisible();
        await activate(list.getByRole('button', { name: '分享 合成歌曲30', exact: true }));
        await expect.poll(() => fixture.sends()).toBe(1);
        expect(fixture.counts()).toEqual({ searchRequests: 0, resolveRequests: 1 });
        expect(fixture.recommendationRequests()).toBe(0);
        expect(fixture.dailyRequests()).toBe(3);
        if (skin.id === 'moyu-island')
          await page.screenshot({ path: info.outputPath('daily-songs.png') });
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: '音乐点歌', exact: true })).toBeFocused();
      });
    }
});
