import { expect, test, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

async function appearance(page: Page, skin: string, mode: string) {
  await page
    .getByRole('button', { name: '切换主题', exact: true })
    .filter({ visible: true })
    .click();
  const dialog = page.getByRole('dialog', { name: '主题模式', exact: true });
  await dialog.getByRole('button', { name: skin, exact: true }).click();
  await dialog.getByRole('button', { name: mode, exact: true }).click();
  await dialog.getByRole('button', { name: '关闭', exact: true }).click();
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    test(`${skin.id} ${mode}: panel choices survive reload and navigation`, async ({
      page,
    }, info) => {
      test.setTimeout(60_000);
      const fixture = await setupChatMenu(page, skin.id, mode);
      const mobile = page.viewportSize()!.width <= 760;
      const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
      if (skin.id !== 'moyu-island')
        await appearance(page, '摸鱼岛', mode === 'light' ? '明亮模式' : '暗夜模式');
      const toggleCircle = (name: string) =>
        page.getByRole('button', { name, exact: true }).filter({ visible: true });
      if (mobile) {
        // Desktop preferences must not hide either mobile entry or its dialog.
        await page.evaluate(async () => {
          const path = '/src/features/appearance/index.ts';
          const { useChatPanelStore } = (await import(
            path
          )) as typeof import('../../src/features/appearance');
          useChatPanelStore.getState().setCircleCollapsed(true);
          useChatPanelStore.getState().setMembersCollapsed(true);
        });
      } else {
        await page.getByRole('button', { name: '隐藏在线成员', exact: true }).click();
        await toggleCircle('收起鱼小圈').click();
      }
      await draft.fill('保留本机偏好草稿');
      const before = fixture.stats();
      await appearance(page, skin.name, mode === 'light' ? '暗夜模式' : '明亮模式');
      await appearance(page, '摸鱼岛', mode === 'light' ? '明亮模式' : '暗夜模式');
      await expect(draft).toHaveText('保留本机偏好草稿');
      expect(fixture.stats().connections).toBe(before.connections);
      expect(fixture.stats().historyRequests).toBe(before.historyRequests);
      const verifyCollapsed = async () => {
        await expect(draft).toBeVisible();
        if (mobile) {
          await page.getByRole('button', { name: '查看聊天列表', exact: true }).tap();
          await expect(page.getByRole('dialog', { name: '聊天列表', exact: true })).toBeVisible();
          await page.getByRole('button', { name: '关闭聊天列表', exact: true }).tap();
          await page.getByRole('button', { name: '打开我的小岛', exact: true }).tap();
          await expect(page.getByRole('dialog', { name: '我的小岛', exact: true })).toBeVisible();
          await page.getByRole('button', { name: '关闭我的小岛', exact: true }).tap();
        } else {
          await expect(
            page.getByRole('button', { name: '展开在线成员', exact: true }),
          ).toHaveAttribute('aria-expanded', 'false');
          await expect(toggleCircle('展开鱼小圈')).toBeVisible();
          await expect(page.locator('#classic-circle-sidebar')).toBeHidden();
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      };
      await page.reload();
      // Fixture restores its initial theme on navigation; the saved preferences remain shared.
      if (skin.id !== 'moyu-island')
        await appearance(page, '摸鱼岛', mode === 'light' ? '明亮模式' : '暗夜模式');
      await verifyCollapsed();
      await page
        .getByRole('link', { name: mobile ? '返回热榜' : '热榜', exact: true })
        .filter({ visible: true })
        .click();
      await page.getByRole('link', { name: '聊天', exact: true }).filter({ visible: true }).click();
      await verifyCollapsed();
      if (!mobile) {
        await page.getByRole('button', { name: '展开在线成员', exact: true }).click();
        await toggleCircle('展开鱼小圈').click();
        await page.reload();
        if (skin.id !== 'moyu-island')
          await appearance(page, '摸鱼岛', mode === 'light' ? '明亮模式' : '暗夜模式');
        await expect(
          page.getByRole('button', { name: '隐藏在线成员', exact: true }),
        ).toHaveAttribute('aria-expanded', 'true');
        await expect(toggleCircle('收起鱼小圈')).toBeVisible();
      }
      await page.screenshot({ path: info.outputPath('panel-preferences.png') });
    });
