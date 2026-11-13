import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: composer divider stays neutral when focused`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const composer = page.getByRole('region', { name: '群聊输入区', exact: true });
      const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
      const baseline = await composer.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          color: style.borderTopColor,
          width: style.borderTopWidth,
          height: el.getBoundingClientRect().height,
        };
      });
      const checkFocus = async () => {
        await expect(draft).toBeFocused();
        await expect(composer).toHaveCSS('border-top-color', baseline.color);
        await expect(composer).toHaveCSS('border-top-width', baseline.width);
        await expect(draft).toHaveCSS('outline-style', 'none');
        await expect(draft).toHaveCSS('box-shadow', 'none');
        await expect(composer).toHaveCSS('box-shadow', 'none');
        expect(await composer.evaluate((el) => el.getBoundingClientRect().height)).toBe(
          baseline.height,
        );
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      };
      if (page.viewportSize()!.width <= 760) await draft.tap();
      else await draft.click();
      await draft.fill('聚焦后继续输入');
      await checkFocus();
      await page.screenshot({ path: info.outputPath('focused.png') });
      await draft.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await checkFocus();
      await expect(draft).toHaveValue('聚焦后继续输入');
      await draft.evaluate((el) => el.blur());
      await expect(composer).toHaveCSS('box-shadow', 'none');
      await expect(composer).toHaveCSS('border-top-color', baseline.color);
      fixture.push('1', '合成消息');
      await expect(page.getByText('合成消息', { exact: true })).toBeVisible();
      await draft.focus();
      await checkFocus();
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      let fail = true;
      await page.route('**/api/chat/message/page/vo', async (route) => {
        await pending;
        if (fail) return route.fulfill({ status: 503 });
        return route.fulfill({ json: { code: 0, data: { records: [] } } });
      });
      const mobile = page.viewportSize()!.width <= 760;
      const leave = mobile
        ? page.getByRole('link', { name: '返回热榜', exact: true })
        : page
            .getByRole('navigation', { name: '主要功能', exact: true })
            .getByRole('link', { name: '热榜', exact: true });
      if (mobile) await leave.tap();
      else await leave.click();
      const enter = page
        .getByRole('navigation', { name: '主要功能', exact: true })
        .getByRole('link', { name: '聊天', exact: true });
      if (mobile) await enter.tap();
      else await enter.click();
      await expect(page.getByText('正在加载历史消息…', { exact: true })).toBeVisible();
      if (mobile) await draft.tap();
      else await draft.click();
      await checkFocus();
      release();
      const retry = page.getByRole('button', { name: '重试历史消息', exact: true });
      await expect(retry).toBeVisible();
      await checkFocus();
      fail = false;
      if (mobile) await retry.tap();
      else await retry.click();
      await expect(retry).toHaveCount(0);
      await draft.focus();
      await checkFocus();
    });
  }
