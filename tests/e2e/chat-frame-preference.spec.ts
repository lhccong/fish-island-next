import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { frameFixture } from './avatar-frames-fixture';

for (const width of [1280, 375, 390]) {
  test.describe(`${width}px frame preference`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: width < 760, hasTouch: width < 760 });
    for (const skin of builtinSkins)
      for (const mode of ['light', 'dark']) {
        test(`${skin.id} ${mode}: 隐藏头像框独立偏好`, async ({ page }, info) => {
          const state = await frameFixture(page, skin.id, mode);
          let history = 0;
          await page.route('**/api/chat/message/page/vo', (route) => {
            history++;
            return route.fulfill({
              json: {
                code: 0,
                data: {
                  records: [1, 2, 3].map((id) => ({
                    messageWrapper: {
                      message: {
                        id: `frame-${id}`,
                        content: '合成头像框复读',
                        timestamp: 1794700000000 + id,
                        sender: {
                          id: `synthetic-${id}`,
                          name: `岛友${id}`,
                          avatar: 'https://frame.test/avatar.svg',
                          avatarFramerUrl: 'https://frame.test/1.svg',
                        },
                      },
                    },
                  })),
                },
              },
            });
          });
          await page.goto('/chat', { waitUntil: 'domcontentloaded' });
          const message = page.locator('[data-message-avatar]');
          const people = page.getByRole('list', { name: '复读参与者', includeHidden: true });
          const showLatest = async () => {
            const latest = page.getByRole('button', { name: '查看最新消息', exact: true });
            if (await latest.isVisible()) await latest.click();
          };
          await showLatest();
          await expect(people.locator('[data-avatar-frame]')).toHaveCount(3);
          const draft = page.getByRole('textbox', { name: '消息草稿', includeHidden: true });
          await draft.fill('保留头像框设置草稿');
          const open = () => page.getByRole('button', { name: '群聊详情', exact: true }).click();
          await open();
          const panel = page.getByRole('complementary', { name: '在线成员', exact: true });
          const toggle = panel.getByRole('switch', { name: '隐藏头像框', exact: true });
          await expect(toggle).not.toBeChecked();
          if (width < 760) await toggle.tap();
          else await toggle.click();
          await expect(toggle).toBeChecked();
          await expect(message).toHaveCount(1);
          await expect(message.locator('[data-avatar-frame]')).toHaveCount(0);
          await expect(people.locator('[data-avatar-frame]')).toHaveCount(0);
          await expect(panel.locator('[data-avatar-frame]')).toHaveCount(0);
          const before = { history, sockets: state.sockets };
          await page.evaluate(
            async ({ id, mode }) => {
              const path = '/src/features/appearance/index.ts';
              const { useAppearanceStore } = (await import(
                path
              )) as typeof import('../../src/features/appearance');
              useAppearanceStore.getState().setSkinId(id);
              useAppearanceStore.getState().setColorMode(mode);
            },
            {
              id: skin.id === 'wps' ? 'pixel-island' : 'wps',
              mode: mode === 'dark' ? 'light' : 'dark',
            },
          );
          await expect(toggle).toBeChecked();
          await expect(draft).toHaveText('保留头像框设置草稿');
          expect({ history, sockets: state.sockets }).toEqual(before);
          const avatars = panel.getByRole('switch', { name: '显示消息头像', exact: true });
          await avatars.click();
          await expect(message).toHaveCount(0);
          await avatars.click();
          await showLatest();
          await expect(message).toHaveCount(1);
          await expect(message.locator('[data-avatar-frame]')).toHaveCount(0);
          await page.screenshot({ path: info.outputPath('hide-avatar-frames.png') });
          await page.reload({ waitUntil: 'domcontentloaded' });
          await showLatest();
          await expect(message).toHaveCount(1);
          await expect(message.locator('[data-avatar-frame]')).toHaveCount(0);
          await open();
          await expect(toggle).toBeChecked();
          if (skin.id === 'wechat' && mode === 'light') {
            await page.evaluate(() => {
              const original = Storage.prototype.setItem;
              Storage.prototype.setItem = function (key: string, value: string) {
                if (key === 'fish-island:chat:hide-avatar-frames')
                  throw new DOMException('synthetic storage denial', 'SecurityError');
                original.call(this, key, value);
              };
            });
            await toggle.click();
            await expect(
              panel.getByRole('status').filter({ hasText: '头像框偏好未能保存' }),
            ).toBeVisible();
          } else await toggle.click();
          await expect(toggle).not.toBeChecked();
          await expect(message.locator('[data-avatar-frame]')).toHaveCount(1);
          await expect(people.locator('[data-avatar-frame]')).toHaveCount(3);
          expect(await panel.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
          await panel.getByRole('button', { name: '关闭在线列表' }).click();
          await expect(panel).toHaveCount(0);
        });
      }
  });
}
