import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(120000);

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: circle refresh across loading, failure, empty and ready`, async ({
      page,
    }, info) => {
      let phase = 'loading';
      let release: (() => void) | undefined;
      try {
        let requests = 0;
        const fixture = await setupChatMenu(page, skin.id, mode, 'user', async () => {
          await page.route('**/api/moments/list', async (route) => {
            requests++;
            if (phase === 'loading')
              await new Promise<void>((resolve) => {
                release = resolve;
              });
            if (phase === 'error') return route.fulfill({ status: 503 });
            return route.fulfill({
              json: {
                code: 0,
                data: {
                  total: phase === 'empty' ? 0 : 1,
                  records:
                    phase === 'empty'
                      ? []
                      : [
                          {
                            id: '202',
                            userId: '456',
                            userName: '合成岛友',
                            content: '刷新后的合成动态',
                            mediaJson: [],
                            createTime: '2026-11-17 10:00:00',
                          },
                        ],
                },
              },
            });
          });
        });
        const editor = page.getByRole('textbox', { name: '消息草稿', exact: true });
        await editor.fill('刷新不丢草稿');
        const mobile = page.viewportSize()!.width <= 760;
        if (mobile || !['moyu-island', 'pixel-island'].includes(skin.id))
          await page.getByRole('button', { name: '打开我的小岛', exact: true }).click();
        const feed = page
          .getByRole('region', { name: '海岛鱼小圈', exact: true })
          .filter({ visible: true });
        const refresh = feed.getByRole('button', { name: '刷新动态', exact: true });
        await expect(refresh).toBeVisible();
        await expect(refresh).toBeDisabled();
        expect((await refresh.boundingBox())!.width).toBeGreaterThanOrEqual(44);
        await expect.poll(() => !!release).toBe(true);
        phase = 'error';
        release!();
        await expect(feed.getByRole('alert')).toBeVisible();
        phase = 'empty';
        await refresh.click();
        await expect(feed.getByText('还没有动态，分享第一条摸鱼日常吧')).toBeVisible();
        phase = 'success';
        await refresh.click();
        await expect(feed.getByText('刷新后的合成动态', { exact: true })).toBeVisible();
        await page.screenshot({ path: info.outputPath('refresh-ready.png') });
        expect(requests).toBeGreaterThanOrEqual(3);
        const dialog = page.getByRole('dialog', { name: '我的小岛', exact: true });
        if (await dialog.isVisible()) await page.keyboard.press('Escape');
        await expect(editor).toHaveText('刷新不丢草稿');
        expect(fixture.stats().connections).toBe(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      } finally {
        release?.();
      }
    });
  }
