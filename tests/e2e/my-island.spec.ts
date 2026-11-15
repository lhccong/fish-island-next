import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(120_000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: personal island editing, persistence and modules`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const before = fixture.stats();
      const chatDraft = page.getByRole('textbox', { name: '消息草稿', exact: true });
      await chatDraft.fill('合成聊天草稿保持独立');
      await page.getByRole('button', { name: '打开我的小岛', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: '我的小岛', exact: true });
      await dialog.getByRole('tab', { name: '手账', exact: true }).click();
      const panel = dialog.getByRole('region', { name: '我的小岛面板' });
      await expect(panel.getByText('给今天安排一件小事吧。')).toBeVisible();
      await panel.getByRole('button', { name: '添加待办', exact: true }).click();
      await panel
        .getByRole('textbox', { name: '新待办', exact: true })
        .fill('合成任务：整理海岛清单');
      await panel
        .getByRole('region', { name: '今日待办', exact: true })
        .getByRole('button', { name: '添加', exact: true })
        .click();
      const task = panel.getByRole('checkbox', { name: '合成任务：整理海岛清单', exact: true });
      await task.check();
      await expect(task).toBeChecked();
      await expect(panel.getByRole('progressbar', { name: '待办完成进度' })).toHaveAttribute(
        'value',
        '1',
      );
      await panel
        .getByRole('textbox', { name: '随手记', exact: true })
        .fill('合成笔记：下次试试海岛配色。');
      await expect(panel.getByRole('status').filter({ hasText: '已保存到本机' })).toBeVisible();
      await page.evaluate(() => {
        const runtime = window as Window & { islandSaveBlocked: boolean };
        runtime.islandSaveBlocked = true;
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (runtime.islandSaveBlocked && key.startsWith('fish-island:my-island:'))
            throw new Error('synthetic quota failure');
          original.call(this, key, value);
        };
      });
      await panel
        .getByRole('textbox', { name: '随手记', exact: true })
        .fill('合成笔记：保存失败时保留内容');
      await expect(panel.getByRole('alert')).toContainText('未能保存到本机');
      await page.screenshot({ path: info.outputPath('my-island-save-error.png'), scale: 'css' });
      await page.evaluate(() => {
        (window as Window & { islandSaveBlocked: boolean }).islandSaveBlocked = false;
      });
      await panel.getByRole('button', { name: '重试保存', exact: true }).click();
      await expect(panel.getByRole('status').filter({ hasText: '已保存到本机' })).toBeVisible();
      await panel
        .getByRole('textbox', { name: '随手记', exact: true })
        .fill('合成笔记：下次试试海岛配色。');
      await panel.getByRole('button', { name: '编辑快捷码头', exact: true }).click();
      await panel.getByRole('combobox', { name: '快捷入口功能' }).click();
      await page.getByRole('option', { name: '自定义链接', exact: true }).click();
      await panel.getByRole('textbox', { name: '快捷入口名称', exact: true }).fill('合成收藏');
      await panel
        .getByRole('textbox', { name: '快捷入口链接', exact: true })
        .fill('javascript:alert(1)');
      await panel.getByRole('button', { name: '添加入口', exact: true }).click();
      await expect(panel.getByRole('alert')).toContainText('有效');
      await panel
        .getByRole('textbox', { name: '快捷入口链接', exact: true })
        .fill('https://example.com/island');
      await panel.getByRole('button', { name: '添加入口', exact: true }).click();
      await expect(panel.getByRole('link', { name: '合成收藏', exact: true })).toHaveAttribute(
        'href',
        'https://example.com/island',
      );
      await panel.getByRole('button', { name: '完成', exact: true }).click();
      await panel.getByRole('button', { name: '自定义模块', exact: true }).click();
      await panel.getByRole('textbox', { name: '岛名', exact: true }).fill('合成海风岛');
      await panel
        .getByRole('textbox', { name: '小岛寄语', exact: true })
        .fill('合成寄语：今天也慢慢来');
      await panel.getByRole('combobox', { name: '小屋装饰' }).click();
      await page.getByRole('option', { name: '钓鱼码头', exact: true }).click();
      await panel.getByRole('button', { name: '上移随手记', exact: true }).click();
      await panel.getByRole('switch', { name: '显示今日待办', exact: true }).click();
      await panel.getByRole('button', { name: '完成小岛编辑', exact: true }).click();
      await expect(panel.getByRole('heading', { name: '合成海风岛', exact: true })).toBeVisible();
      await expect(panel.getByRole('region', { name: '今日待办', exact: true })).toHaveCount(0);
      await expect(panel.getByRole('textbox', { name: '随手记', exact: true })).toHaveValue(
        '合成笔记：下次试试海岛配色。',
      );
      await expect(panel.getByRole('status').filter({ hasText: '已保存到本机' })).toBeVisible();
      expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: info.outputPath('my-island.png'), scale: 'css' });
      await dialog.getByRole('button', { name: '关闭我的小岛', exact: true }).click();
      await expect(page.getByRole('button', { name: '打开我的小岛', exact: true })).toBeFocused();
      await expect(chatDraft).toHaveText('合成聊天草稿保持独立');
      expect(fixture.stats().connections).toBe(before.connections);
      expect(fixture.stats().historyRequests).toBe(before.historyRequests);
      await page.reload();
      await page.getByRole('button', { name: '打开我的小岛', exact: true }).click();
      await dialog.getByRole('tab', { name: '手账', exact: true }).click();
      await expect(dialog.getByRole('heading', { name: '合成海风岛', exact: true })).toBeVisible();
      await expect(dialog.getByRole('link', { name: '合成收藏', exact: true })).toBeVisible();
      await expect(dialog.getByRole('textbox', { name: '随手记', exact: true })).toHaveValue(
        '合成笔记：下次试试海岛配色。',
      );
      await page.keyboard.press('Escape');
    });
  }
