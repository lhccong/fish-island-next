import { expect, test, type Route } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { openMessageActions } from './chat-message-actions';

type SendInput = { content: string; clientMessageId: string; pokeTargetId?: string };

for (const skin of builtinSkins) {
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: repeat and poke Big Fish`, async ({ page }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const mobile = page.viewportSize()!.width <= 760;
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      const scroll = page.getByRole('region', { name: '群聊消息区', exact: true });
      const requests: SendInput[] = [];
      let held!: Route;
      await page.route('**/api/chat/message/send', (route) => {
        requests.push(route.request().postDataJSON() as SendInput);
        held = route;
      });
      const accept = async (id: string, input: SendInput) => {
        const message = {
          id,
          sender: { id: '123', name: '本人合成' },
          content: input.pokeTargetId ? '本人合成拍了拍「大肥鱼」' : input.content,
          timestamp: Date.now(),
          clientMessageId: input.clientMessageId,
          ...(input.pokeTargetId
            ? { poke: { targetId: input.pokeTargetId, targetName: '大肥鱼', suffix: '' } }
            : {}),
        };
        fixture.broadcast(message);
        await held.fulfill({ json: { code: 0, data: { message } } });
        const row = scroll.locator(`[data-message-id="${id}"]`);
        await expect(row).toHaveCount(1);
        await expect(row).toContainText(input.pokeTargetId ? '我拍了拍「大肥鱼」' : input.content);
      };

      await draft.fill('保留原草稿');
      const speech = '今天也要记得摸鱼。';
      fixture.broadcast({
        id: '100',
        bigFish: true,
        sender: { id: '-2', name: '大肥鱼' },
        content: speech,
        timestamp: Date.now(),
      });
      const fish = scroll.locator('[data-message-id="100"]');
      const bubble = fish.getByRole('group', { name: '大肥鱼的消息' });
      const avatar = fish.getByRole('button', { name: '通过头像 @大肥鱼' });
      await expect(avatar).toHaveAccessibleDescription('单击提及，双击戳一戳');
      const bounds = (await avatar.boundingBox())!;
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);

      if (mobile) {
        const menu = await openMessageActions(page, '100');
        await menu.getByRole('menuitem', { name: '复读机', exact: true }).tap();
      } else {
        await bubble.hover();
        await fish.getByRole('button', { name: '复读', exact: true }).click();
      }
      await expect.poll(() => requests.length).toBe(1);
      const [repeat] = requests;
      expect(repeat).toEqual({ content: speech, clientMessageId: expect.any(String) });
      await accept('101', repeat!);
      await expect(fish).toContainText(speech);
      await expect(draft).toHaveText('保留原草稿');

      if (mobile) {
        await avatar.tap();
        await avatar.tap();
      } else await avatar.dblclick({ delay: 70 });
      await expect.poll(() => requests.length).toBe(2);
      const poke = requests[1]!;
      expect(poke).toEqual({
        content: '',
        clientMessageId: expect.any(String),
        pokeTargetId: '-2',
      });
      const pending = scroll.locator('[data-message-id^="local:"]');
      await expect(pending.getByRole('status')).toHaveText('发送中…');
      await held.fulfill({ json: { code: 50000, message: '合成失败，请重试' } });
      await expect(pending.getByRole('alert')).toHaveText('合成失败，请重试');
      const retry = pending.getByRole('button', { name: '重试发送' });
      if (mobile) await retry.tap();
      else await retry.click();
      await expect.poll(() => requests.length).toBe(3);
      expect(requests[2]).toEqual(poke);
      await accept('102', poke);
      await expect(draft).toHaveText('保留原草稿');

      if (!mobile) {
        await bubble.press('Shift+F10');
        await expect(page.getByRole('menuitem', { name: '复读机' })).toBeEnabled();
        await page.keyboard.press('Escape');
        await expect(bubble).toBeFocused();
      }
      const menu = await openMessageActions(page, '100');
      const pokeItem = menu.getByRole('menuitem', { name: '戳一戳', exact: true });
      if (skin.id === 'wps' || skin.id === 'moyu-island') {
        await page.screenshot({ path: info.outputPath('big-fish-menu.png') });
      }
      if (mobile) await pokeItem.tap();
      else await pokeItem.click();
      await expect.poll(() => requests.length).toBe(4);
      expect(requests[3]).toMatchObject({ content: '', pokeTargetId: '-2' });
      await accept('103', requests[3]!);
      await expect(draft).toHaveText('保留原草稿');
      expect(fixture.stats().connections).toBe(1);
      expect(
        await scroll.evaluate((node) => node.scrollWidth - node.clientWidth),
      ).toBeLessThanOrEqual(1);
    });
  }
}
