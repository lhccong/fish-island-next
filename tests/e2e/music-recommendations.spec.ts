import { expect, test, type Locator, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { musicViewports } from './music-viewports';
import { setupMusic, releaseMusicFixture } from './music-fixture';

test.afterEach(async ({ page }) => releaseMusicFixture(page));

async function activate(page: Page, button: Locator) {
  if (page.viewportSize()!.width < 760) await button.tap();
  else await button.click();
}

musicViewports(() => {
  for (const skin of builtinSkins)
    for (const mode of ['light', 'dark']) {
      test(`${skin.id} ${mode}: one-click recommended music, explicit retry and sharing`, async ({
        page,
      }, info) => {
        const fixture = await setupMusic(page, skin.id, mode);
        const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
        await draft.fill('今日推荐保留草稿');
        const dialog = await fixture.open();
        const recommendations = dialog.getByRole('button', { name: '今日推荐', exact: true });
        const playback = dialog.getByRole('region', { name: '音乐播放控制' });
        fixture.phase('loading');
        await activate(page, recommendations);
        await expect(
          dialog.getByRole('status').filter({ hasText: '正在寻找推荐歌曲' }),
        ).toBeVisible();
        await expect(recommendations).toHaveAttribute('aria-pressed', 'true');
        expect(fixture.recommendationRequests()).toBe(1);
        fixture.phase('empty');
        await expect(dialog.getByRole('alert')).toContainText('暂无推荐歌曲');
        fixture.phase('error');
        await activate(page, dialog.getByRole('button', { name: '重试今日推荐', exact: true }));
        await expect(dialog.getByRole('alert')).toContainText('后端 yml');
        expect(fixture.recommendationRequests()).toBe(2);
        await page.screenshot({ path: info.outputPath('recommendations-error.png') });
        fixture.phase('success');
        await activate(page, dialog.getByRole('button', { name: '重试今日推荐', exact: true }));
        await expect(dialog.getByRole('button', { name: '暂停音乐', exact: true })).toBeVisible();
        expect(fixture.recommendationRequests()).toBe(3);
        expect(fixture.counts().searchRequests).toBe(0);
        const first = await playback.locator('strong').innerText();
        await activate(page, dialog.getByRole('button', { name: '下一首', exact: true }));
        await expect(playback.locator('strong')).not.toHaveText(first);
        await expect(dialog.getByRole('button', { name: '暂停音乐', exact: true })).toBeVisible();
        expect(fixture.recommendationRequests()).toBe(3);
        const second = await playback.locator('strong').innerText();
        await page.locator('audio').evaluate((audio: HTMLAudioElement) => {
          audio.currentTime = audio.duration - 0.08;
        });
        await expect(playback.locator('strong')).not.toHaveText(second);
        await expect(dialog.getByRole('button', { name: '暂停音乐', exact: true })).toBeVisible();
        expect(fixture.recommendationRequests()).toBe(3);
        fixture.failSending(true);
        await activate(page, dialog.getByRole('button', { name: '发送到聊天', exact: true }));
        await expect.poll(() => fixture.sends()).toBe(1);
        await expect(dialog.getByRole('textbox', { name: '搜索歌曲或歌手' })).toHaveValue('');
        const layout = await dialog.evaluate((el) => ({
          overflow: el.scrollWidth > el.clientWidth,
          controls: [...el.querySelectorAll('button')]
            .filter((button) =>
              ['今日推荐', '下一首', '发送到聊天'].includes(button.textContent?.trim() ?? ''),
            )
            .map((button) => button.getBoundingClientRect().height),
        }));
        expect(layout.overflow).toBe(false);
        for (const height of layout.controls)
          expect(height).toBeGreaterThanOrEqual(page.viewportSize()!.width < 760 ? 44 : 32);
        await page.screenshot({ path: info.outputPath('recommendations-playing.png') });
        await page.keyboard.press('Escape');
        await expect(draft).toHaveText('今日推荐保留草稿');
        await expect(page.getByRole('button', { name: '重试发送', exact: true })).toBeVisible();
        fixture.failSending(false);
        await activate(page, page.getByRole('button', { name: '重试发送', exact: true }));
        await expect.poll(() => fixture.sends()).toBe(2);
        await expect(page.locator('[data-delivery="sent"]')).toHaveCount(1);
        await page.getByRole('button', { name: '音乐悬浮球', exact: true }).click();
        const floating = page.getByRole('dialog', { name: '音乐悬浮播放', exact: true });
        await expect(floating.getByRole('button', { name: '下一首', exact: true })).toBeEnabled();
        await floating.getByRole('button', { name: '打开播放器', exact: true }).click();
        await activate(page, recommendations);
        await expect(recommendations).toHaveAttribute('aria-pressed', 'false');
        await expect(dialog.getByRole('button', { name: '下一首', exact: true })).toBeDisabled();
        await expect(dialog.getByRole('button', { name: '暂停音乐', exact: true })).toBeVisible();
        await dialog.getByRole('button', { name: '关闭音乐', exact: true }).click();
        await expect(page.getByRole('button', { name: '音乐悬浮球', exact: true })).toBeFocused();
        expect(fixture.stats()).toMatchObject({ connections: 1, historyRequests: 1 });
      });
    }
});
