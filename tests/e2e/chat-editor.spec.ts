import { test, expect } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: rich draft editing and keyboard send`, async ({ page }, info) => {
      const editor = page.getByRole('textbox', { name: '消息草稿' });
      const mobile = page.viewportSize()!.width <= 760;
      await setupChatMenu(page, skin.id, mode, 'user', async () => {
        await page.route('**/api/chat/online/user', (route) =>
          route.fulfill({
            json: { code: 0, data: [{ id: '456', name: '合成岛友', avatar: null }] },
          }),
        );
      });
      await editor.fill('草稿');
      await page.getByRole('button', { name: '表情包', exact: true }).click();
      const face = page.getByRole('button', { name: '/微笑', exact: true });
      if (mobile) await face.tap();
      else await face.click();
      await expect(editor.getByRole('img', { name: '[qqface:14]', exact: true })).toBeVisible();
      await expect(editor).toHaveText('草稿');
      await expect(editor).toBeFocused();
      await editor.pressSequentially('后文');
      await expect(editor).toHaveText('草稿后文');
      await page.screenshot({ path: info.outputPath('rendered-draft.png') });
      await editor.press('Backspace');
      await editor.press('Backspace');
      await editor.press('Backspace');
      await expect(editor.getByRole('img')).toHaveCount(0);
      await editor.press('ControlOrMeta+z');
      await expect(editor.getByRole('img')).toHaveCount(1);
      const copied = await editor.evaluate((el) => {
        const selection = window.getSelection()!;
        selection.selectAllChildren(el);
        const clipboardData = new DataTransfer();
        el.dispatchEvent(
          new ClipboardEvent('copy', { bubbles: true, cancelable: true, clipboardData }),
        );
        return clipboardData.getData('text/plain');
      });
      expect(copied).toBe('草稿[qqface:14]');
      await editor.fill('');
      await editor.evaluate((el) => {
        const clipboardData = new DataTransfer();
        clipboardData.setData('text/plain', '安全内容');
        clipboardData.setData('text/html', '<img src="https://untrusted.test/picture.png">');
        el.dispatchEvent(
          new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }),
        );
      });
      await expect(editor).toHaveText('安全内容');
      await expect(editor.getByRole('img')).toHaveCount(0);
      let sent = '';
      await page.route('**/api/chat/message/send', async (route) => {
        const data = route.request().postDataJSON() as { content: string; clientMessageId: string };
        sent = data.content;
        await route.fulfill({
          json: {
            code: 0,
            data: {
              message: {
                id: '1794530000098',
                content: data.content,
                clientMessageId: data.clientMessageId,
                sender: { id: '123', name: '本人合成' },
                timestamp: Date.now(),
              },
            },
          },
        });
      });
      const paragraph = () =>
        editor.evaluate((el) =>
          el.dispatchEvent(
            new InputEvent('beforeinput', {
              inputType: 'insertParagraph',
              bubbles: true,
              cancelable: true,
            }),
          ),
        );
      if (mobile) {
        await expect(editor).toHaveAttribute('enterkeyhint', 'send');
        await editor.fill('@合成');
        await expect(page.getByRole('option', { name: '合成岛友', exact: true })).toBeVisible();
        expect(await paragraph()).toBe(false);
        await expect(editor).toHaveText('@合成岛友');
        expect(sent).toBe('');
      }
      await editor.fill('第一行');
      if (mobile) {
        await editor.dispatchEvent('compositionstart');
        expect(await paragraph()).toBe(true);
        await expect(editor).toHaveText('第一行');
        await editor.dispatchEvent('compositionend');
      }
      await editor.press('Shift+Enter');
      await editor.pressSequentially('第二行');
      if (mobile) expect(await paragraph()).toBe(false);
      else await editor.press('Enter');
      await expect.poll(() => sent).toBe('第一行\n第二行');
      await expect(editor).toHaveText('');
      await expect(editor).toBeFocused();
    });
  }
