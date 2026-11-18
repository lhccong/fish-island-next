import { musicViewports } from './music-viewports';
import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupMusic, releaseMusicFixture } from './music-fixture';
test.afterEach(async ({ page }) => releaseMusicFixture(page));

musicViewports(() => {
  test('appearance changes preserve audio, queue, volume, draft and connection', async ({
    page,
  }) => {
    test.setTimeout(90000);
    const fixture = await setupMusic(page, 'wps', 'light');
    await page
      .getByRole('textbox', { name: '消息草稿', exact: true })
      .fill('换肤保留的音乐聊天草稿');
    const dialog = await fixture.open();
    await dialog.getByRole('textbox', { name: '搜索歌曲或歌手' }).fill('合成');
    await dialog.getByRole('button', { name: '搜索', exact: true }).click();
    await dialog.getByRole('button', { name: '点歌 合成歌曲1', exact: true }).click();
    await expect(dialog.getByRole('button', { name: '暂停音乐' })).toBeVisible();
    await dialog.getByRole('button', { name: '点歌 合成歌曲2', exact: true }).click();
    await dialog.getByRole('slider', { name: '音量', exact: true }).fill('0.3');
    await dialog.getByRole('slider', { name: '音量', exact: true }).press('ArrowLeft');
    const audio = await page.locator('audio').elementHandle();
    const volume = await audio!.evaluate((el: HTMLAudioElement) => el.volume);
    await dialog.getByRole('button', { name: '今日推荐', exact: true }).click();
    await page.keyboard.press('Escape');
    const counts = fixture.counts();
    await page.getByRole('button', { name: '切换主题', exact: true }).click();
    const picker = page.getByRole('dialog', { name: '主题模式', exact: true });
    for (const skin of builtinSkins) {
      await picker.getByRole('button', { name: skin.name, exact: true }).click();
      for (const mode of ['暗夜模式', '明亮模式']) {
        await picker.getByRole('button', { name: mode, exact: true }).click();
        expect(await audio!.evaluate((el: HTMLAudioElement) => el.isConnected && !el.paused)).toBe(
          true,
        );
        expect(fixture.counts()).toEqual(counts);
        expect(fixture.recommendationRequests()).toBe(0);
        expect(fixture.stats()).toMatchObject({ connections: 1, historyRequests: 1 });
      }
    }
    await picker.getByRole('button', { name: '关闭主题弹窗', exact: true }).click();
    await fixture.open();
    await expect(dialog.getByRole('button', { name: '今日推荐', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(dialog.getByRole('button', { name: '待播 1', exact: true })).toBeVisible();
    await expect(dialog.getByRole('slider', { name: '音量', exact: true })).toHaveValue(
      String(volume),
    );
    await expect(dialog.getByRole('region', { name: '音乐播放控制' })).toContainText('合成歌曲1');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('textbox', { name: '消息草稿', exact: true })).toHaveText(
      '换肤保留的音乐聊天草稿',
    );
    const back = page.getByRole('link', { name: '返回热榜', exact: true });
    if (await back.isVisible()) {
      await back.click();
      expect(await audio!.evaluate((el: HTMLAudioElement) => !el.paused)).toBe(true);
    }
    await page.getByRole('button', { name: '用户菜单', exact: true }).click();
    await page.getByRole('menuitem', { name: '退出登录', exact: true }).click();
    await expect(page.locator('audio')).toHaveCount(0);
    expect(
      await audio!.evaluate((el: HTMLAudioElement) => el.paused && !el.getAttribute('src')),
    ).toBe(true);
    await audio?.dispose();
  });

  test('unavailable songs retry and media errors keep queue recoverable', async ({ page }) => {
    const fixture = await setupMusic(page);
    let fail = true;
    await page.route('**/api/third-party/music/url?**', (route) =>
      route.fulfill({
        json: fail
          ? { code: 50001, message: '这首歌曲暂无可用音源，请换一首' }
          : { code: 0, data: 'https://music.example.test/retry.wav' },
      }),
    );
    const dialog = await fixture.open();
    await dialog.getByRole('textbox', { name: '搜索歌曲或歌手' }).fill('合成');
    await dialog.getByRole('button', { name: '搜索', exact: true }).click();
    await dialog.getByRole('button', { name: '点歌 合成歌曲1', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('暂无可用音源');
    fail = false;
    await dialog.getByRole('button', { name: '播放音乐' }).click();
    await expect(dialog.getByRole('button', { name: '暂停音乐' })).toBeVisible();
    await dialog.getByRole('button', { name: '点歌 合成歌曲2', exact: true }).click();
    await page.locator('audio').evaluate((audio) => audio.dispatchEvent(new Event('error')));
    await expect(dialog.getByRole('alert')).toContainText('歌曲加载失败');
    await dialog.getByRole('button', { name: '下一首' }).click();
    await expect(dialog.getByRole('button', { name: '暂停音乐' })).toBeVisible();
    await expect(dialog.getByRole('region', { name: '音乐播放控制' })).toContainText('合成歌曲2');
  });

  test('short phone viewport keeps search, playback and close reachable', async ({
    page,
  }, info) => {
    test.skip(page.viewportSize()!.width > 760, 'Phone keyboard layout');
    await page.setViewportSize({
      width: page.viewportSize()!.width,
      height: 460,
    });
    const fixture = await setupMusic(page, 'pixel-island', 'dark');
    const dialog = await fixture.open();
    await dialog.getByRole('textbox', { name: '搜索歌曲或歌手' }).fill('合成');
    await dialog.getByRole('button', { name: '搜索', exact: true }).click();
    await expect(dialog.getByRole('button', { name: '点歌 合成歌曲1', exact: true })).toBeVisible();
    for (const label of ['搜索', '播放音乐', '关闭音乐']) {
      const box = (await dialog.getByRole('button', { name: label, exact: true }).boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(460);
    }
    await page.screenshot({ path: info.outputPath('short-phone.png') });
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });
});
