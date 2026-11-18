import { expect, test, type Locator, type Route } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(60_000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    test(`${skin.id} ${mode}: avatar double activation preserves draft and reuses poke lifecycle`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const mobile = page.viewportSize()!.width <= 760;
      const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
      const sends: Record<string, string>[] = [];
      let held!: Route;
      await page.route('**/api/chat/message/send', (route) => {
        sends.push(route.request().postDataJSON() as Record<string, string>);
        held = route;
      });
      const activate = async (avatar: Locator, twice = false) => {
        if (mobile) {
          await avatar.tap();
          if (twice) await avatar.tap();
        } else if (twice) await avatar.dblclick({ delay: 80 });
        else await avatar.click();
      };
      await draft.fill('保留原草稿');
      // The empty state has no accidental gesture target.
      await expect(page.locator('[data-message-avatar]')).toHaveCount(0);
      fixture.push('1', '合成岛友消息');
      fixture.push('2', '本人消息', true);
      const avatar = page.locator('[data-message-id="1"] [data-message-avatar]');
      const ownAvatar = page.locator('[data-message-id="2"] [data-message-avatar]');
      await expect(avatar).toBeVisible();
      await expect(avatar).toHaveAccessibleDescription('单击提及，双击戳一戳');
      const bounds = (await avatar.boundingBox())!;
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(await avatar.evaluate((el) => getComputedStyle(el).touchAction)).toBe('manipulation');
      await activate(avatar);
      await expect(draft).toHaveText('保留原草稿 @合成岛友 ');
      await expect(draft).toBeFocused();
      expect(sends).toHaveLength(0);
      await draft.fill('保留原草稿');
      await avatar.focus();
      await avatar.press('Enter');
      await expect(draft).toHaveText('保留原草稿 @合成岛友 ');
      await draft.fill('保留原草稿');
      await avatar.focus();
      await avatar.press('Space');
      await expect(draft).toHaveText('保留原草稿 @合成岛友 ');
      await draft.fill('保留原草稿');
      // Clicking another control cancels the delayed mention.
      await activate(avatar);
      await draft.focus();
      await page.waitForTimeout(400);
      await expect(draft).toHaveText('保留原草稿');
      if (!mobile) {
        await avatar.focus();
        await avatar.press('Shift+Tab');
        await page.keyboard.press('Tab');
        await expect(avatar).toBeFocused();
        expect(await avatar.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
        await avatar.hover();
      }
      await activate(avatar, true);
      await expect.poll(() => sends.length).toBe(1);
      expect(sends[0]).toMatchObject({ content: '', pokeTargetId: '456' });
      expect(sends[0]!.quotedMessageId).toBeUndefined();
      const pending = page.locator('[data-message-id^="local:"]');
      await expect(pending.getByRole('status')).toHaveText('发送中…');
      await page.waitForTimeout(400);
      await expect(draft).toHaveText('保留原草稿');
      // The existing sender prevents another poke while one is in flight.
      await activate(ownAvatar, true);
      await expect(page.getByText('戳一戳未提交，请处理待发送消息后重试')).toBeVisible();
      expect(sends).toHaveLength(1);
      await held.fulfill({ json: { code: 50000, message: '合成失败，请重试' } });
      await expect(pending.getByRole('alert')).toHaveText('合成失败，请重试');
      await page.screenshot({ path: info.outputPath('avatar-poke-error.png') });
      const retry = pending.getByRole('button', { name: '重试发送', exact: true });
      if (mobile) await retry.tap();
      else await retry.click();
      await expect.poll(() => sends.length).toBe(2);
      expect(sends[1]).toEqual(sends[0]);
      const message = {
        id: '100',
        sender: { id: '123', name: '本人合成' },
        content: '兼容提示',
        timestamp: Date.now(),
        clientMessageId: sends[0]!.clientMessageId,
        poke: { targetId: '456', targetName: '合成岛友', suffix: '长后缀验证手机换行'.repeat(3) },
      };
      fixture.broadcast(message);
      await held.fulfill({ json: { code: 0, data: { message } } });
      await expect(page.locator('[data-message-id="100"]')).toHaveCount(1);
      await expect(page.locator('[data-message-id="100"]')).toContainText('我拍了拍「合成岛友」');
      await page.waitForTimeout(400);
      await expect(draft).toHaveText('保留原草稿');
      await activate(ownAvatar, true);
      await expect.poll(() => sends.length).toBe(3);
      expect(sends[2]!.pokeTargetId).toBe('123');
      await held.fulfill({
        json: {
          code: 0,
          data: {
            message: {
              ...message,
              id: '101',
              clientMessageId: sends[2]!.clientMessageId,
              poke: { targetId: '123', targetName: '本人合成', suffix: '' },
            },
          },
        },
      });
      await expect(page.locator('[data-message-id="101"]')).toContainText('我拍了拍「我」');
      await page.waitForTimeout(400);
      await expect(draft).toHaveText('保留原草稿');
      const scroll = page.getByRole('region', { name: '群聊消息区', exact: true });
      expect(await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(fixture.stats()).toMatchObject({ connections: 1, historyRequests: 1 });
      await page.screenshot({ path: info.outputPath('avatar-poke-success.png') });
    });
