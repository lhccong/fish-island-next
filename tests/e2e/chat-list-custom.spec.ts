import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(60_000);

test('switching appearances preserves custom list and chat state', async ({ page }) => {
  test.skip(page.viewportSize()!.width <= 760, 'uses desktop theme entry and then resizes');
  await page.addInitScript(() =>
    localStorage.setItem(
      'fish-island:chat:list-appearance',
      JSON.stringify({
        custom: true,
        groupPreview: '本周 Todo',
        entries: [{ id: 'one', name: '整理需求', preview: '周五之前' }],
      }),
    ),
  );
  const fixture = await setupChatMenu(page, 'wechat', 'light');
  const draft = page.getByRole('textbox', { name: '消息草稿' });
  await draft.fill('换肤保留草稿');
  const stats = fixture.stats();
  for (const skin of builtinSkins) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole('button', { name: '切换主题', exact: true }).click();
    const picker = page.getByRole('dialog', { name: '主题模式', exact: true });
    await picker.getByRole('button', { name: skin.name, exact: true }).click();
    for (const mode of ['暗夜模式', '明亮模式'])
      await picker.getByRole('button', { name: mode, exact: true }).click();
    await page.keyboard.press('Escape');
    for (const width of [1280, 375, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const popup = width <= 760 || skin.id === 'wps';
      if (popup) await page.getByRole('button', { name: '查看聊天列表', exact: true }).click();
      const list = page.getByRole('region', { name: '聊天列表滚动区', exact: true });
      await expect(list.getByText('整理需求', { exact: true })).toBeVisible();
      const query = page.getByRole('searchbox', { name: '搜索聊天', exact: true });
      await query.fill('不匹配');
      await expect(list.getByRole('status')).toHaveText('未找到匹配的条目');
      await query.fill('周五');
      await expect(list.getByText('整理需求', { exact: true })).toBeVisible();
      await query.fill('');
      if (popup) await page.keyboard.press('Escape');
      await expect(draft).toHaveText('换肤保留草稿');
      expect(fixture.stats()).toMatchObject({
        connections: stats.connections,
        historyRequests: stats.historyRequests,
      });
    }
  }
});

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: customize list, persistence, failure and scroll`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const mobile = page.viewportSize()!.width <= 760;
      const popup = mobile || skin.id === 'wps';
      await page.getByRole('textbox', { name: '消息草稿' }).fill('保留聊天草稿');
      const baseline = fixture.stats();
      const openList = async () => {
        if (popup) await page.getByRole('button', { name: '查看聊天列表', exact: true }).click();
      };
      await openList();
      const list = page.getByRole('region', { name: '聊天列表滚动区', exact: true });
      const editor = page.getByRole('dialog', { name: '自定义聊天列表', exact: true });
      const edit = async () =>
        page.getByRole('button', { name: '自定义聊天列表', exact: true }).click();
      await edit();
      await editor.getByRole('combobox').click();
      await page.getByRole('option', { name: '自定义清单', exact: true }).click();
      await expect(editor.getByRole('status')).toContainText('清单还是空的');
      await editor.getByLabel('群聊摘要', { exact: true }).fill('本周 Todo');
      await editor.getByRole('button', { name: '添加条目', exact: true }).click();
      await editor.getByRole('button', { name: '保存', exact: true }).click();
      await expect(editor.getByRole('alert')).toContainText('请填写条目名称');
      await editor.getByLabel('名称', { exact: true }).fill('整理项目需求');
      await editor.getByLabel('摘要', { exact: true }).fill('明天下班前完成');
      await page.evaluate(() => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === 'fish-island:chat:list-appearance')
            throw new Error('synthetic storage failure');
          original.call(this, key, value);
        };
        Object.assign(window, {
          restoreListStorage: () => {
            Storage.prototype.setItem = original;
          },
        });
      });
      await editor.getByRole('button', { name: '保存', exact: true }).click();
      await expect(editor.getByRole('alert')).toContainText('本地保存失败');
      await page.evaluate(() =>
        (window as unknown as { restoreListStorage(): void }).restoreListStorage(),
      );
      await editor.getByRole('button', { name: '保存', exact: true }).click();
      await expect(editor).toHaveCount(0);
      await expect(page.getByRole('button', { name: '自定义聊天列表', exact: true })).toBeFocused();
      await expect(list.getByText('整理项目需求', { exact: true })).toBeVisible();
      await expect(list.getByText('本周 Todo', { exact: true })).toBeVisible();
      await expect(list.locator('[data-kind="member"]')).toHaveCount(0);
      await edit();
      await editor.getByLabel('名称', { exact: true }).fill('取消的修改');
      await editor.getByRole('button', { name: '取消', exact: true }).click();
      await expect(list.getByText('整理项目需求', { exact: true })).toBeVisible();
      await page.screenshot({ path: info.outputPath('custom-list.png') });
      if (popup) await page.getByRole('button', { name: '关闭聊天列表', exact: true }).click();
      await expect(page.getByRole('textbox', { name: '消息草稿' })).toHaveText('保留聊天草稿');
      expect(fixture.stats().connections).toBe(baseline.connections);
      expect(fixture.stats().historyRequests).toBe(baseline.historyRequests);
      await page.reload();
      await openList();
      await expect(list.getByText('整理项目需求', { exact: true })).toBeVisible();
      await edit();
      for (let i = 2; i <= 8; i++) {
        await editor.getByRole('button', { name: '添加条目', exact: true }).click();
        await editor.getByLabel('名称', { exact: true }).last().fill(`事项 ${i}`);
      }
      const viewport = editor.getByRole('region', { name: '列表设置滚动区' });
      if (mobile) {
        await viewport.evaluate((el) => {
          el.scrollTop = 0;
        });
        const box = (await viewport.boundingBox())!;
        const session = await page.context().newCDPSession(page);
        const x = box.x + box.width - 10;
        const y = box.y + box.height - 30;
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        });
        for (let step = 1; step <= 6; step++) {
          await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y - step * 30 }],
          });
          await page.waitForTimeout(40);
        }
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
        await session.detach();
      }
      await viewport.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      expect(await viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      await editor.getByLabel('摘要', { exact: true }).last().focus();
      const bounds = await editor
        .getByLabel('摘要', { exact: true })
        .last()
        .evaluate((el) => {
          const area = el.closest('[data-radix-scroll-area-viewport]')!;
          return {
            gap: area.getBoundingClientRect().right - el.getBoundingClientRect().right,
            overflow: area.scrollWidth - area.clientWidth,
          };
        });
      expect(bounds.gap).toBeGreaterThanOrEqual(mobile ? 20 : 24);
      expect(bounds.overflow).toBeLessThanOrEqual(1);
      if (!mobile) await viewport.hover();
      const track = viewport.locator('..').locator('[data-orientation="vertical"]');
      if (mobile) await expect(track).toHaveCSS('visibility', 'hidden');
      else await expect(track).toHaveCSS('opacity', '1');
      await page.screenshot({ path: info.outputPath('custom-editor.png') });
      await editor.getByRole('button', { name: '删除条目 8', exact: true }).click();
      await expect(editor.getByRole('group', { name: '条目 8', exact: true })).toHaveCount(0);
      await editor.getByRole('combobox').click();
      await page.getByRole('option', { name: '默认对话列表', exact: true }).click();
      await editor.getByRole('button', { name: '保存', exact: true }).click();
      await expect(page.getByRole('button', { name: '刷新聊天列表', exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
