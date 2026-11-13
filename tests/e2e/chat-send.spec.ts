import { expect, test, type Route } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { openMessageActions } from './chat-message-actions';
test.setTimeout(60000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: HTTP send, quote, pending, retry and responsive layout`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      const send = page.getByRole('button', { name: '发送', exact: true });
      await expect(send).toBeDisabled();
      const commands: Record<string, string>[] = [];
      let held: Route | undefined;
      await page.route('**/api/chat/message/send', async (route) => {
        commands.push(route.request().postDataJSON() as Record<string, string>);
        held = route;
      });
      await draft.fill('合成发送正文');
      await draft.dispatchEvent('compositionstart');
      await draft.press('Enter');
      expect(commands).toHaveLength(0);
      await draft.dispatchEvent('compositionend');
      await draft.fill('合成发送正文');
      const composer = page.getByRole('region', { name: '群聊输入区', exact: true });
      const beforeSend = await composer.boundingBox();
      await send.click();
      await expect(page.getByLabel('消息发送中')).toBeVisible();
      await expect(draft).toHaveText('');
      await expect(composer.getByText('消息已提交', { exact: true })).toHaveCount(0);
      expect(await composer.boundingBox()).toEqual(beforeSend);
      await expect.poll(() => commands.length).toBe(1);
      expect(Object.keys(commands[0]!).sort()).toEqual(['clientMessageId', 'content']);
      await draft.fill('发送时保留下一条草稿');
      await page.screenshot({ path: info.outputPath('sending.png') });
      await held!.fulfill({ json: { code: 50001, message: '合成失败，请重试' } });
      await expect(page.getByRole('button', { name: '重试发送' })).toBeVisible();
      await expect(draft).toHaveText('发送时保留下一条草稿');
      await page.getByRole('button', { name: '重试发送' }).click();
      await expect.poll(() => commands.length).toBe(2);
      expect(commands[0]).toEqual(commands[1]);
      await expect(page.getByLabel('消息发送中')).toBeVisible();
      const canonical = {
        id: '1794530000001',
        content: '合成发送正文',
        clientMessageId: commands[1]!.clientMessageId,
        sender: { id: '123', name: '服务端昵称' },
        timestamp: 1794530000001,
      };
      fixture.broadcast(canonical);
      await expect(page.getByText('服务端昵称', { exact: true })).toBeVisible();
      await expect(page.getByLabel('消息发送中')).toBeVisible();
      await held!.fulfill({ json: { code: 0, data: { message: canonical } } });
      fixture.broadcast(canonical);
      await expect(page.getByLabel('消息发送中')).toHaveCount(0);
      await expect(composer.getByText('消息已提交', { exact: true })).toHaveCount(0);
      expect(await composer.boundingBox()).toEqual(beforeSend);
      await expect(page.getByText('服务端昵称', { exact: true })).toBeVisible();
      await expect(page.locator('[data-delivery="sent"]')).toHaveCount(1);
      await openMessageActions(page, '1794530000001');
      await page.getByRole('menuitem', { name: '引用', exact: true }).click();
      await expect(page.getByRole('region', { name: '引用消息', exact: true })).toContainText(
        '合成发送正文',
      );
      await page.getByRole('button', { name: '取消引用', exact: true }).click();
      fixture.push('1794530000002', '被引用的合成正文');
      await openMessageActions(page, '1794530000002');
      await page.getByRole('menuitem', { name: '引用', exact: true }).click();
      await draft.fill('合成引用回复');
      await send.click();
      await expect.poll(() => commands.length).toBe(3);
      expect(commands[2]!.quotedMessageId).toBe('1794530000002');
      expect(Object.keys(commands[2]!).sort()).toEqual([
        'clientMessageId',
        'content',
        'quotedMessageId',
      ]);
      await held!.fulfill({
        json: {
          code: 0,
          data: {
            message: {
              ...canonical,
              id: '1794530000003',
              content: '合成引用回复',
              clientMessageId: commands[2]!.clientMessageId,
              quotedMessage: {
                id: '1794530000002',
                content: '被引用的合成正文',
                sender: { name: '合成岛友' },
              },
            },
          },
        },
      });
      await expect(
        page.getByRole('button', { name: '定位原文：合成岛友', exact: true }),
      ).toContainText('被引用的合成正文');
      await expect(page.getByLabel('消息发送中')).toHaveCount(0);
      await draft.fill('   ');
      await expect(send).toBeDisabled();
      await draft.fill('x'.repeat(5001));
      await expect(send).toBeDisabled();
      await draft.fill('保留的草稿');
      const box = await send.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(page.viewportSize()!.width <= 760 ? 44 : 32);
      const bounds = await page
        .locator('[aria-label="群聊输入区"]')
        .evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
      expect(bounds.scroll).toBeLessThanOrEqual(bounds.client);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(fixture.stats().commands.filter((c) => c.type === 2)).toHaveLength(0);
      await page.screenshot({ path: info.outputPath('sent.png') });
    });
  }
