import { expect, test, type Route } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { openMessageActions } from './chat-message-actions';

test.setTimeout(60_000);

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: private remarks loading, retry, save, clear and focus`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      let load: Route | undefined;
      let save: Route | undefined;
      const writes: Record<string, string>[] = [];
      let loads = 0;
      await page.route('**/api/userRemark/get', (route) => {
        loads++;
        load = route;
      });
      await page.route('**/api/userRemark/save', (route) => {
        writes.push(
          JSON.parse((route.request().postDataJSON() as { content: string }).content) as Record<
            string,
            string
          >,
        );
        save = route;
      });
      fixture.push('1001', '备注验证正文');
      await page.getByRole('textbox', { name: '消息草稿' }).fill('保留草稿');
      await openMessageActions(page, '1001');
      await page.getByRole('menuitem', { name: '设置备注', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: '设置备注', exact: true });
      const input = dialog.getByRole('textbox', { name: '备注名称', exact: true });
      // The initial fixture returns an invalid legacy shape; loading must be retried before writing.
      await dialog.getByRole('button', { name: '重试加载备注' }).click();
      await expect(dialog.getByRole('status')).toHaveText('正在加载备注…');
      await expect(dialog.getByRole('button', { name: '保存', exact: true })).toBeDisabled();
      await expect.poll(() => Boolean(load)).toBe(true);
      await load!.fulfill({ json: { code: 0, data: { content: '{"789":"其他备注"}' } } });
      await expect(input).toHaveValue('');
      if (page.viewportSize()!.width <= 760) await input.tap();
      else await input.focus();
      await input.fill('合成备注');
      const bounds = await input.evaluate((el) => {
        const viewport = el.closest('[data-radix-scroll-area-viewport]')!;
        const box = el.getBoundingClientRect();
        const area = viewport.getBoundingClientRect();
        return {
          gap: area.right - box.right,
          overflow: viewport.scrollWidth - viewport.clientWidth,
        };
      });
      expect(bounds.gap).toBeGreaterThanOrEqual(page.viewportSize()!.width <= 760 ? 20 : 24);
      expect(bounds.overflow).toBeLessThanOrEqual(1);
      await dialog.getByRole('button', { name: '保存', exact: true }).click();
      await expect(dialog.getByRole('button', { name: '保存中…' })).toBeDisabled();
      await expect.poll(() => writes.length).toBe(1);
      await save!.fulfill({ json: { code: 50000 } });
      await expect(dialog.getByRole('alert')).toContainText('备注操作失败');
      await expect(input).toHaveValue('合成备注');
      await dialog.getByRole('button', { name: '保存', exact: true }).click();
      await expect.poll(() => writes.length).toBe(2);
      expect(writes[1]).toEqual({ '456': '合成备注', '789': '其他备注' });
      await save!.fulfill({ json: { code: 0, data: true } });
      await expect(dialog.getByRole('status')).toHaveText('备注已保存');
      await page.screenshot({ path: info.outputPath('remark-saved.png') });
      await input.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(page.locator('[data-message-id="1001"]').getByRole('group')).toBeFocused();
      const row = page.locator('[data-message-id="1001"]');
      const meta = row.locator('time').locator('..');
      const name = meta.locator(':scope > span');
      await expect(name).toHaveText('合成备注');
      const nameBox = (await name.boundingBox())!;
      const bubbleBox = (await row.getByRole('group').boundingBox())!;
      expect(Math.abs(nameBox.x - bubbleBox.x)).toBeLessThanOrEqual(1);
      if (page.viewportSize()!.width > 760) {
        expect((await meta.boundingBox())!.height).toBeLessThan(24);
        expect(bubbleBox.y - (nameBox.y + nameBox.height)).toBeCloseTo(6, 0);
        await name.hover();
        expect(await name.boundingBox()).toEqual(nameBox);
      }
      await page.screenshot({ path: info.outputPath('message-name-layout.png') });
      if (page.viewportSize()!.width > 760) {
        await page.getByRole('button', { name: '切换主题', exact: true }).click();
        const picker = page.getByRole('dialog', { name: '主题模式' });
        await picker
          .getByRole('button', { name: skin.id === 'wps' ? '微信绿' : 'WPS 表格', exact: true })
          .click();
        await picker
          .getByRole('button', { name: mode === 'light' ? '暗夜模式' : '明亮模式', exact: true })
          .click();
        await picker.getByRole('button', { name: '关闭', exact: true }).click();
        await expect(name).toHaveText('合成备注');
        expect(loads).toBe(1);
      }
      await page.route('**/api/chat/online/user', (route) =>
        route.fulfill({ json: { code: 0, data: [{ id: '456', name: '合成岛友', avatar: null }] } }),
      );
      const mobile = page.viewportSize()!.width <= 760;
      if (mobile) await page.getByRole('button', { name: '查看聊天列表' }).tap();
      const list = page.getByRole('region', { name: '聊天列表', exact: true });
      await list.getByRole('button', { name: '刷新聊天列表' }).click();
      await list.getByRole('searchbox', { name: '搜索聊天' }).fill('合成备注');
      const memberName = list.getByRole('button', { name: '设置合成岛友的备注' });
      await expect(memberName).toHaveText('合成备注');
      await memberName.click();
      await expect(input).toHaveValue('合成备注');
      await input.press('Escape');
      await expect(memberName).toBeFocused();
      if (mobile) await page.getByRole('button', { name: '关闭聊天列表' }).click();
      await openMessageActions(page, '1001');
      await page.getByRole('menuitem', { name: '设置备注', exact: true }).click();
      await expect(input).toHaveValue('合成备注');
      await input.fill('');
      await dialog.getByRole('button', { name: '保存', exact: true }).click();
      await expect.poll(() => writes.length).toBe(3);
      expect(writes[2]).toEqual({ '789': '其他备注' });
      await save!.fulfill({ json: { code: 0, data: true } });
      await expect(dialog.getByRole('status')).toHaveText('备注已清除');
      await dialog.getByRole('button', { name: '关闭', exact: true }).click();
      await expect(row.getByRole('group')).toBeFocused();
      await expect(name).toHaveText('合成岛友');
      await expect(page.getByRole('textbox', { name: '消息草稿' })).toHaveText('保留草稿');
      expect(fixture.stats().connections).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
