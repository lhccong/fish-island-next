import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { musicViewports } from './music-viewports';
import { setupMusic, releaseMusicFixture } from './music-fixture';

test.afterEach(async ({ page }) => releaseMusicFixture(page));
musicViewports(() => {
  for (const skin of builtinSkins)
    for (const mode of ['light', 'dark']) {
      test(`${skin.id} ${mode}: standalone worksheet music`, async ({ page }, info) => {
        const fixture = await setupMusic(page, skin.id, mode);
        await page.goto('/chat/mini', { waitUntil: 'domcontentloaded' });
        const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
        await draft.fill('小窗分享保留的草稿');
        const dialog = await fixture.open();
        await dialog.getByRole('textbox', { name: '搜索歌曲或歌手' }).fill('合成');
        await dialog.getByRole('button', { name: '搜索', exact: true }).click();
        await dialog.getByRole('button', { name: '点歌 合成歌曲1', exact: true }).click();
        await expect(dialog.getByRole('button', { name: '暂停音乐' })).toBeVisible();
        await dialog.getByRole('button', { name: '发送到聊天', exact: true }).click();
        await page.keyboard.press('Escape');
        await expect(page.locator('[data-delivery="sent"]')).toHaveCount(1);
        await expect(draft).toHaveText('小窗分享保留的草稿');
        const message = page.getByRole('button', { name: '播放音乐 合成歌曲1', exact: true });
        if (page.viewportSize()!.width < 760) await message.tap();
        else await message.click();
        const orb = page.getByRole('button', { name: '音乐悬浮球', exact: true });
        await orb.click();
        const floating = page.getByRole('dialog', { name: '音乐悬浮播放', exact: true });
        await expect(floating.getByRole('button', { name: '悬浮球暂停音乐' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.screenshot({ path: info.outputPath('mini-music.png') });
        await floating.getByRole('button', { name: '停止并关闭', exact: true }).click();
        await expect(orb).toHaveCount(0);
      });
    }
});
