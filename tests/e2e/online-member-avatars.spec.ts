import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { frameFixture } from './avatar-frames-fixture';

for (const width of [1280, 375, 390]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: width < 760, hasTouch: width < 760 });
    for (const skin of builtinSkins)
      for (const mode of ['light', 'dark']) {
        test(`${skin.id} ${mode}: 在线成员只显示原头像`, async ({ page }, info) => {
          await frameFixture(page, skin.id, mode);
          let state = 'loading';
          let release!: () => void;
          const gate = new Promise<void>((resolve) => {
            release = resolve;
          });
          await page.route('**/api/chat/online/user', async (route) => {
            if (state === 'loading') await gate;
            await route.fulfill({
              json:
                state === 'error'
                  ? { code: 50000, message: '在线成员读取失败' }
                  : {
                      code: 0,
                      data:
                        state === 'empty'
                          ? []
                          : [
                              {
                                id: 'synthetic-other',
                                name: '另一岛友',
                                avatar: 'https://frame.test/avatar.svg',
                                avatarFramerUrl: 'https://frame.test/1.svg',
                              },
                            ],
                    },
            });
          });
          try {
            await page.goto('/chat', { waitUntil: 'domcontentloaded' });
            await page.getByRole('button', { name: '群聊详情', exact: true }).click();
            const panel = page.getByRole('complementary', { name: '在线成员', exact: true });
            await expect(
              panel.getByRole('status').filter({ hasText: '正在获取在线成员' }),
            ).toBeVisible();
            state = 'error';
            release();
            await expect(panel.getByRole('alert')).toBeVisible();
            state = 'empty';
            await panel.getByRole('button', { name: '重试', exact: true }).click();
            await expect(panel.getByText('暂无在线成员，可稍后刷新查看。')).toBeVisible();
            state = 'ready';
            await panel.getByRole('button', { name: '刷新', exact: true }).click();
            const member = panel.locator('#online-members-grid li');
            await expect(member).toHaveCount(1);
            await expect(member.locator('img')).toHaveAttribute(
              'src',
              'https://frame.test/avatar.svg',
            );
            await expect(panel.locator('[data-avatar-frame]')).toHaveCount(0);
            const search = panel.getByRole('searchbox', { name: '搜索在线成员' });
            await search.fill('不存在的合成岛友');
            await expect(panel.getByText('没有找到匹配的在线成员，请更换关键词。')).toBeVisible();
            await search.fill('');
            await expect(member).toHaveCount(1);
            await expect(page.locator('[data-message-avatar] [data-avatar-frame]')).toHaveCount(1);
            expect(await panel.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
            await page.screenshot({ path: info.outputPath('online-members.png') });
            await panel.getByRole('button', { name: '关闭在线列表' }).click();
            await expect(panel).toHaveCount(0);
            await expect(page.locator('[data-message-avatar] [data-avatar-frame]')).toHaveCount(1);
          } finally {
            release();
          }
        });
      }
  });
}
