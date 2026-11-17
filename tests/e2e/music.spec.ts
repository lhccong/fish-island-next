import { musicViewports } from './music-viewports';
import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupMusic, releaseMusicFixture } from './music-fixture';
test.afterEach(async ({ page }) => releaseMusicFixture(page));

musicViewports(() => {
  for (const skin of builtinSkins)
    for (const mode of ['light', 'dark']) {
      test(`${skin.id} ${mode}: search states, scrolling, queue and media`, async ({
        page,
      }, info) => {
        const fixture = await setupMusic(page, skin.id, mode);
        expect(fixture.counts()).toEqual({ searchRequests: 0, resolveRequests: 0 });
        const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
        await draft.fill('音乐操作保留聊天草稿');
        const dialog = await fixture.open();
        const field = dialog.getByRole('textbox', { name: '搜索歌曲或歌手' });
        await expect(dialog.getByText('搜索喜欢的歌曲，点歌后在本机播放')).toBeVisible();
        fixture.phase('loading');
        await field.fill('合成空结果');
        await dialog.getByRole('button', { name: '搜索', exact: true }).click();
        await expect(dialog.getByRole('status').filter({ hasText: '正在搜索歌曲' })).toBeVisible();
        fixture.phase('empty');
        await expect(dialog.getByText('没有找到歌曲，试试其他关键词或来源')).toBeVisible();
        fixture.phase('error');
        await dialog.getByRole('button', { name: '搜索', exact: true }).click();
        await expect(dialog.getByRole('alert')).toContainText('后端 yml');
        fixture.phase('success');
        await dialog.getByRole('button', { name: '重试歌曲' }).click();
        const results = dialog.getByRole('region', { name: '音乐搜索结果' });
        await expect(
          results.getByRole('button', { name: '点歌 合成歌曲1', exact: true }),
        ).toBeVisible();
        await dialog.getByRole('combobox', { name: '音乐来源' }).click();
        await page.keyboard.press('Escape');
        await expect(dialog.getByRole('combobox', { name: '音乐来源' })).toBeFocused();
        await dialog.getByRole('combobox', { name: '音乐来源' }).click();
        await page.getByRole('option', { name: 'QQ 音乐', exact: true }).click();
        await expect(dialog.getByRole('combobox', { name: '音乐来源' })).toHaveText('QQ 音乐');
        await expect(
          results.getByRole('button', { name: '点歌 合成歌曲1', exact: true }),
        ).toBeVisible();
        await results.getByRole('button', { name: '点歌 合成歌曲1', exact: true }).click();
        await expect(dialog.getByRole('button', { name: '暂停音乐' })).toBeEnabled();
        await expect
          .poll(() =>
            page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.currentTime),
          )
          .toBeGreaterThan(0);
        await results.getByRole('button', { name: '点歌 合成歌曲2', exact: true }).click();
        await dialog.getByRole('button', { name: '暂停音乐' }).click();
        await expect(dialog.getByRole('button', { name: '播放音乐' })).toBeVisible();
        await dialog.getByRole('button', { name: '播放音乐' }).click();
        await dialog.getByRole('slider', { name: '播放进度' }).fill('10');
        await dialog.getByRole('slider', { name: '播放进度' }).press('ArrowRight');
        await expect
          .poll(() =>
            page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.currentTime),
          )
          .toBeGreaterThanOrEqual(10);
        if (page.viewportSize()!.width > 760) {
          await results.hover();
          await page.mouse.wheel(0, 200);
        } else {
          const touch = await page.context().newCDPSession(page);
          const box = (await results.boundingBox())!;
          const x = box.x + box.width / 2;
          const y = box.y + box.height * 0.8;
          await touch.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y }],
          });
          for (let step = 1; step <= 6; step++) {
            await touch.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x, y: y - step * 20 }],
            });
            await page.evaluate(() => new Promise(requestAnimationFrame));
          }
          await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await touch.detach();
        }
        await expect.poll(() => results.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
        await results.evaluate((element) => {
          element.scrollTop = element.scrollHeight;
        });
        await expect(
          results.getByRole('button', { name: '点歌 合成歌曲22', exact: true }),
        ).toBeVisible();
        await results.hover();
        const layout = await results.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const last = element.querySelector('button:last-of-type')!.getBoundingClientRect();
          const scrollbar = element.parentElement!.querySelector('[data-orientation="vertical"]');
          return {
            overflow: element.scrollWidth > element.clientWidth,
            endGap: bounds.right - last.right,
            gutter: parseFloat(getComputedStyle(element).paddingRight),
            track: scrollbar ? getComputedStyle(scrollbar).visibility : 'absent',
          };
        });
        expect(layout.overflow).toBe(false);
        expect(layout.endGap).toBeGreaterThanOrEqual(page.viewportSize()!.width > 760 ? 12 : 8);
        expect(layout.gutter).toBeGreaterThanOrEqual(page.viewportSize()!.width > 760 ? 24 : 20);
        if (page.viewportSize()!.width < 760) expect(['hidden', 'absent']).toContain(layout.track);
        await results.getByRole('button', { name: '点歌 合成歌曲22', exact: true }).focus();
        await expect(
          results.getByRole('button', { name: '点歌 合成歌曲22', exact: true }),
        ).toBeInViewport();
        await page.screenshot({ path: info.outputPath(`${skin.id}-${mode}-results.png`) });
        await dialog.getByRole('button', { name: '下一首' }).click();
        await expect(dialog.getByRole('region', { name: '音乐播放控制' })).toContainText(
          '合成歌曲2',
        );
        await expect(dialog.getByRole('button', { name: '暂停音乐' })).toBeVisible();
        await dialog.getByRole('button', { name: '待播 0', exact: true }).click();
        await expect(dialog.getByText('暂无待播歌曲，搜索后点歌加入')).toBeVisible();
        await dialog.getByRole('button', { name: '发送到聊天', exact: true }).click();
        await expect.poll(() => fixture.sends()).toBe(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        await page.screenshot({ path: info.outputPath(`${skin.id}-${mode}.png`) });
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: '音乐点歌' })).toBeFocused();
        await expect(draft).toHaveText('音乐操作保留聊天草稿');
        const musicMessage = page.getByRole('button', { name: '播放音乐 合成歌曲2', exact: true });
        await expect(musicMessage).toBeVisible();
        await expect(page.locator('[data-delivery="sent"]')).toHaveCount(1);
        await expect(page.getByRole('button', { name: '重试发送', exact: true })).toHaveCount(0);
        const orb = page.getByRole('button', { name: '音乐悬浮球', exact: true });
        await orb.click();
        const floating = page.getByRole('dialog', { name: '音乐悬浮播放', exact: true });
        await floating.getByRole('button', { name: '悬浮球暂停音乐', exact: true }).click();
        expect(
          await page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.paused),
        ).toBe(true);
        await page.keyboard.press('Escape');
        await musicMessage.click();
        await expect
          .poll(() => page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.paused))
          .toBe(false);
        await orb.click();
        await floating.getByRole('button', { name: '打开播放器', exact: true }).click();
        await expect(dialog).toBeVisible();
        await page.keyboard.press('Escape');
        await orb.click();
        await page.screenshot({ path: info.outputPath(`${skin.id}-${mode}-floating.png`) });
        expect(await floating.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        await page.keyboard.press('Escape');
        expect(
          await page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.paused),
        ).toBe(false);
        const counts = fixture.counts();
        await fixture.open();
        await expect(dialog.getByRole('region', { name: '音乐播放控制' })).toContainText(
          '合成歌曲2',
        );
        expect(fixture.counts()).toEqual(counts);
        expect(fixture.stats()).toMatchObject({ connections: 1, historyRequests: 1 });
      });
    }
});
