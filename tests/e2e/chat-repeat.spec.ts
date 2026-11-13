import { expect, test, type Route } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
test.setTimeout(60000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: direct repeat, merge, titles, retry, revoke and layout`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('保留独立草稿');
      const commands: Record<string, string>[] = [];
      let held: Route | undefined;
      await page.route('**/api/chat/message/send', (route) => {
        commands.push(route.request().postDataJSON() as Record<string, string>);
        held = route;
      });
      const body = '连续复读的合成消息';
      const push = (id: string, senderId: string) =>
        fixture.broadcast({
          id,
          content: body,
          sender: { id: senderId, name: `合成岛友${senderId}`, titleId: 7 },
          timestamp: 1794530000000 + Number(id),
        });
      push('1', '456');
      await expect(page.locator('[data-message-id="1"]')).toBeVisible();
      await expect(page.getByRole('button', { name: '加一复读' })).toHaveCount(0);
      push('2', '789');
      const repeat = page.getByRole('button', { name: '加一复读', exact: true });
      await expect(repeat).toBeVisible();
      const buttonBox = await repeat.boundingBox();
      expect(buttonBox!.height).toBeGreaterThanOrEqual(44);
      expect(buttonBox!.width).toBeGreaterThanOrEqual(44);
      const bubbleBox = await page.locator('[data-message-id="2"] [role="group"]').boundingBox();
      expect(buttonBox!.x).toBeGreaterThanOrEqual(bubbleBox!.x + bubbleBox!.width);
      if (page.viewportSize()!.width <= 760) await repeat.tap();
      else {
        await repeat.focus();
        await page.keyboard.press('Enter');
      }
      await expect.poll(() => commands.length).toBe(1);
      expect(commands[0]!.content).toBe(body);
      expect(commands[0]!.quotedMessageId).toBeUndefined();
      await expect(draft).toHaveText('保留独立草稿');
      await expect(page.getByRole('button', { name: '复读发送中' })).toBeDisabled();
      await held!.fulfill({ json: { code: 50001, message: '合成复读失败' } });
      await expect(page.getByRole('button', { name: '重试发送' })).toBeVisible();
      await expect(page.getByRole('group', { name: '连续复读：3条', exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: '重试发送' }).click();
      await expect.poll(() => commands.length).toBe(2);
      expect(commands[1]).toEqual(commands[0]);
      const canonical = {
        id: '3',
        content: body,
        clientMessageId: commands[1]!.clientMessageId,
        sender: { id: '123', name: '本人合成', titleId: 7 },
        timestamp: Date.now(),
      };
      await held!.fulfill({ json: { code: 0, data: { message: canonical } } });
      fixture.broadcast(canonical);
      await expect(page.getByRole('group', { name: '连续复读：3条', exact: true })).toBeVisible();
      await expect(page.locator('[data-message-id]')).toHaveCount(1);
      await expect(
        page.getByRole('list', { name: '复读参与者' }).getByRole('listitem'),
      ).toHaveCount(3);
      const participants = page.getByRole('list', { name: '复读参与者' });
      await expect(participants).toHaveText('合合本');
      await expect(participants.getByRole('listitem').first()).toHaveAttribute(
        'title',
        '合成岛友456：电玩少女',
      );
      await expect(page.getByRole('button', { name: /展开复读消息|收起复读消息/ })).toHaveCount(0);
      const strip = await participants.boundingBox();
      const mergedBubble = await page
        .locator('[data-message-id="1"] [aria-haspopup="menu"]')
        .last()
        .boundingBox();
      expect(strip!.height).toBe(20);
      expect(strip!.y - (mergedBubble!.y + mergedBubble!.height)).toBeGreaterThanOrEqual(0);
      expect(strip!.y - (mergedBubble!.y + mergedBubble!.height)).toBeLessThanOrEqual(5);
      await expect
        .poll(() =>
          participants.locator('li > span > span').evaluateAll((els) =>
            els.map((el) => ({
              width: el.getBoundingClientRect().width,
              height: el.getBoundingClientRect().height,
            })),
          ),
        )
        .toEqual(Array.from({ length: 3 }, () => ({ width: 20, height: 20 })));
      await page.screenshot({ path: info.outputPath('merged.png') });
      const originalViewport = page.viewportSize()!;
      if (originalViewport.width <= 760) await page.setViewportSize({ width: 1280, height: 900 });
      await page.getByRole('button', { name: '切换主题', exact: true }).click();
      const picker = page.getByRole('dialog', { name: '主题模式' });
      await picker
        .getByRole('button', { name: mode === 'light' ? '暗夜模式' : '明亮模式', exact: true })
        .click();
      const other = builtinSkins.find((item) => item.id !== skin.id)!;
      await picker.getByRole('button', { name: other.name, exact: true }).click();
      await picker.getByRole('button', { name: '关闭主题弹窗' }).click();
      if (originalViewport.width <= 760) await page.setViewportSize(originalViewport);
      await expect(page.getByRole('group', { name: '连续复读：3条', exact: true })).toBeVisible();
      await expect(draft).toHaveText('保留独立草稿');

      const overflow = await page
        .locator('[data-message-id], [aria-label="复读参与者"], [aria-label="群聊消息区"]')
        .evaluateAll((els) => els.some((el) => el.scrollWidth > el.clientWidth + 1));
      expect(overflow).toBe(false);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expect(draft).toHaveText('保留独立草稿');
      fixture.revoke('2');
      await expect(page.getByRole('group', { name: '连续复读：3条', exact: true })).toHaveCount(0);
      await expect(page.locator('[data-message-id]')).toHaveCount(3);
      await expect(page.getByText('消息已撤回', { exact: true })).toBeVisible();
      expect(fixture.stats().connections).toBe(1);
      expect(fixture.stats().historyRequests).toBe(1);
      const longContent = 'https://synthetic.test/' + 'long-path'.repeat(40);
      fixture.push('1799999999991', longContent);
      fixture.push('1799999999992', longContent);
      await expect(page.getByRole('button', { name: '加一复读' })).toBeVisible();
      const longRow = page.locator('[data-message-id="1799999999992"]');
      await expect(longRow).toBeVisible();
      expect(await longRow.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    });
  }
