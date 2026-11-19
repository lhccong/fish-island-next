import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

async function sendWithKeyboard(draft: Locator, text: string, mobile: boolean) {
  await expect(draft).toBeInViewport();
  await expect(draft).toHaveAttribute('enterkeyhint', 'send');
  if (mobile) await draft.tap();
  await draft.fill(text);
  if (mobile) {
    expect(await draft.evaluate((el) => el.dispatchEvent(new InputEvent('beforeinput', {
      inputType: 'insertParagraph', bubbles: true, cancelable: true,
    })))).toBe(false);
  } else await draft.press('Enter');
  await expect(draft).toHaveText('');
  await expect(draft).toBeFocused();
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    test(`${skin.id} ${mode}: return key in floating and standalone chat`, async ({ page }) => {
      const sent: string[] = [];
      await setupChatMenu(page, skin.id, mode);
      await page.route('**/api/chat/message/send', (route) => {
        const data = route.request().postDataJSON() as { content: string; clientMessageId: string };
        sent.push(data.content);
        return route.fulfill({ json: { code: 0, data: { message: {
          ...data, id: String(sent.length), sender: { id: '123', name: '本人合成' }, timestamp: Date.now(),
        } } } });
      });
      const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
      const mobile = page.viewportSize()!.width <= 760;
      const entry = page.getByRole('button', { name: '小窗模式', exact: true });
      const classic = skin.id === 'moyu-island';
      if (classic || !(await entry.isVisible()))
        await page.getByRole('button', { name: '更多聊天工具', exact: true }).click();
      if (classic) await page.getByRole('menuitem', { name: '小窗模式', exact: true }).click();
      else await entry.click();
      await page.getByRole('combobox', { name: '小窗显示模式', exact: true }).click();
      await page.getByRole('option', { name: 'Excel 模式', exact: true }).click();
      await sendWithKeyboard(draft, '应用内小窗合成发送', mobile);
      await expect.poll(() => sent.length).toBe(1);
      await page.goto('/chat/mini', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('main', { name: '独立聊天小窗', exact: true })).toBeVisible();
      await sendWithKeyboard(draft, '独立小窗合成发送', mobile);
      await expect.poll(() => sent).toEqual(['应用内小窗合成发送', '独立小窗合成发送']);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
