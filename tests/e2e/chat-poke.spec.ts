import { expect, test, type Route } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { openMessageActions } from './chat-message-actions';
import { mockProfile } from './account-profile-fixture';
import { checkProfileScrollGutter } from './profile-scroll-layout';

test.setTimeout(90_000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: poke send, retry, snapshot, user card and revoke`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const mobile = page.viewportSize()!.width <= 760;
      const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
      await draft.fill('戳一戳保留草稿');
      fixture.push('1', '合成普通消息');
      const requests: Record<string, string>[] = [];
      let held!: Route;
      await page.route('**/api/chat/message/send', (route) => {
        requests.push(route.request().postDataJSON() as Record<string, string>);
        held = route;
      });
      const menu = await openMessageActions(page, '1');
      const item = menu.getByRole('menuitem', { name: '戳一戳', exact: true });
      if (mobile) await item.tap();
      else await item.click();
      const notice = page.locator('[data-message-id^="local:"]');
      await expect(notice.getByRole('status')).toHaveText('发送中…');
      expect(requests[0]).toMatchObject({ content: '', pokeTargetId: '456' });
      expect(requests[0]!.quotedMessageId).toBeUndefined();
      await held.fulfill({ json: { code: 50000, message: '合成戳一戳失败' } });
      await expect(notice.getByRole('alert')).toHaveText('合成戳一戳失败');
      await notice.getByRole('button', { name: '重试发送' }).click();
      await expect.poll(() => requests.length).toBe(2);
      expect(requests[1]).toEqual(requests[0]);
      const suffix = '超级长的自定义被戳后缀用于手机换行与边界验证嗷嗷🤪';
      const message = {
        id: '200',
        sender: { id: '123', name: '本人合成' },
        content: '兼容文字',
        timestamp: Date.now(),
        clientMessageId: requests[0]!.clientMessageId,
        poke: { targetId: '456', targetName: '合成岛友', suffix },
      };
      fixture.broadcast(message);
      await held.fulfill({ json: { code: 0, data: { message } } });
      const sent = page.locator('[data-message-id="200"]');
      await expect(sent).toHaveCount(1);
      await expect(sent).toContainText(`我拍了拍「合成岛友」${suffix}`);
      await expect(sent.getByRole('button', { name: '撤回', exact: true })).toBeEnabled();
      expect(await sent.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await expect(draft).toHaveText('戳一戳保留草稿');
      const button = sent.getByRole('button', { name: '撤回', exact: true });
      await button.focus();
      const box = (await button.boundingBox())!;
      expect(box.height).toBeLessThanOrEqual(mobile ? 22 : 20);
      const inline = await button.evaluate((el) => {
        const style = getComputedStyle(el);
        const hit = getComputedStyle(el, '::before');
        return {
          border: style.borderTopWidth,
          background: style.backgroundColor,
          font: style.fontSize,
          parentFont: getComputedStyle(el.parentElement!).fontSize,
          hitWidth: parseFloat(hit.width),
          hitHeight: parseFloat(hit.height),
        };
      });
      expect(inline.border).toBe('0px');
      expect(inline.background).toBe('rgba(0, 0, 0, 0)');
      expect(inline.font).toBe(inline.parentFont);
      if (mobile) {
        expect(inline.hitWidth).toBeGreaterThanOrEqual(44);
        expect(inline.hitHeight).toBeGreaterThanOrEqual(44);
      } else {
        await button.hover();
        expect(await button.evaluate((el) => getComputedStyle(el).textDecorationLine)).toContain(
          'underline',
        );
        await button.press('Shift+Tab');
        await page.keyboard.press('Tab');
        await expect(button).toBeFocused();
        expect(await button.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
      }
      await page.screenshot({ path: info.outputPath('poke-success.png') });
      if (mobile) {
        const touchPoint = { x: box.x + box.width / 2, y: box.y + box.height / 2 - 18 };
        expect(
          await button.evaluate(
            (el, point) => document.elementFromPoint(point.x, point.y) === el,
            touchPoint,
          ),
        ).toBe(true);
        await page.touchscreen.tap(touchPoint.x, touchPoint.y);
      } else await button.press('Enter');
      const pendingRevoke = sent.getByRole('button', { name: '撤回中…', exact: true });
      await expect(pendingRevoke).toBeDisabled();
      await expect(pendingRevoke.getByRole('status')).toHaveText('撤回中…');
      fixture.revoke('200');
      await expect(sent).toHaveText('戳一戳已撤回');
      fixture.broadcast({
        ...message,
        id: '201',
        clientMessageId: undefined,
        sender: { id: '456', name: '合成岛友' },
        poke: { targetId: '123', targetName: '本人合成', suffix: '' },
      });
      await expect(page.locator('[data-message-id="201"]')).toHaveText('合成岛友拍了拍「我」');
      await page.route('**/api/user/get/vo?*', (route) =>
        route.fulfill({ json: { code: 0, data: { id: '456', userName: '合成岛友' } } }),
      );
      await page.route('**/api/follow/is-following?*', (route) =>
        route.fulfill({ json: { code: 0, data: false } }),
      );
      const cardEntry = page
        .locator('[data-message-id="1"]')
        .getByRole('button', { name: '查看合成岛友的用户卡片' });
      if (mobile) await cardEntry.tap();
      else await cardEntry.click();
      const card = page.getByRole('dialog', { name: '用户卡片', exact: true });
      const poke = card.getByRole('button', { name: '戳一戳', exact: true });
      await expect(poke).toBeEnabled();
      if (mobile) await poke.tap();
      else await poke.click();
      await expect(card).toHaveCount(0);
      await expect.poll(() => requests.length).toBe(3);
      await held.fulfill({
        json: {
          code: 0,
          data: {
            message: {
              ...message,
              id: '202',
              clientMessageId: requests[2]!.clientMessageId,
              poke: { targetId: '456', targetName: '合成岛友', suffix: '' },
            },
          },
        },
      });
      await expect(page.locator('[data-message-id="202"]')).toContainText('我拍了拍「合成岛友」');
      const short = page.locator('[data-message-id="202"] [data-poke-content="true"]');
      const shortBox = (await short.boundingBox())!;
      const shortButtonBox = (await short
        .getByRole('button', { name: '撤回', exact: true })
        .boundingBox())!;
      expect(shortBox.height).toBeLessThanOrEqual(mobile ? 22 : 20);
      expect(Math.abs(shortBox.y - shortButtonBox.y)).toBeLessThanOrEqual(2);
      expect(shortBox.width).toBeLessThan(page.viewportSize()!.width - 24);
      await page.screenshot({ path: info.outputPath('poke-default.png') });
      await expect(draft).toHaveText('戳一戳保留草稿');
      expect(fixture.stats().connections).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });

    test(`${skin.id} ${mode}: suffix limit, save, failure, clear and restore`, async ({
      page,
    }, info) => {
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skin: skin.id, mode },
      );
      const state = await mockProfile(page, mode);
      await page.goto('/user/login', { waitUntil: 'domcontentloaded' });
      await page.getByRole('textbox', { name: '账号或邮箱', exact: true }).fill('synthetic-user');
      await page.getByLabel('密码', { exact: true }).fill('synthetic-password');
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await page.getByRole('button', { name: '用户菜单', exact: true }).click();
      await page.getByRole('menuitem', { name: '个人资料与签到', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: '修改信息', exact: true }).click();
      const field = dialog.getByRole('textbox', { name: '被戳后缀', exact: true });
      const scroll = page.getByRole('region', { name: '个人资料编辑区', exact: true });
      await expect(field).toHaveValue('');
      await checkProfileScrollGutter(page);
      if (page.viewportSize()!.width <= 760) {
        const area = (await scroll.boundingBox())!;
        const touch = await page.context().newCDPSession(page);
        const x = area.x + area.width / 2;
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y: area.y + area.height - 30 }],
        });
        for (let step = 1; step <= 6; step++)
          await touch.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: area.y + area.height - 30 - ((area.height - 70) * step) / 6 }],
          });
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await touch.detach();
        await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      }
      await scroll.focus();
      await scroll.press('End');
      await expect
        .poll(() => scroll.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop))
        .toBeLessThanOrEqual(1);
      await field.focus();
      await field.fill('戳'.repeat(31));
      await expect(field).toHaveValue('戳'.repeat(30));
      await expect(dialog.getByText('30/30', { exact: true })).toBeVisible();
      await field.fill('W'.repeat(30));
      expect(await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      if (page.viewportSize()!.width <= 760) await field.tap();
      await field.fill('嗷嗷🤪');
      await expect(dialog.locator('#poke-preview')).toHaveText('岛友拍了拍「合成岛友」嗷嗷🤪');
      const viewport = (await scroll.boundingBox())!;
      const fieldBox = (await field.boundingBox())!;
      expect(fieldBox.x - viewport.x).toBeGreaterThanOrEqual(4);
      expect(viewport.x + viewport.width - fieldBox.x - fieldBox.width).toBeGreaterThanOrEqual(
        page.viewportSize()!.width <= 760 ? 20 : 24,
      );
      await expect
        .poll(async () => {
          const area = (await scroll.boundingBox())!;
          const input = (await field.boundingBox())!;
          return area.y + area.height - input.y - input.height;
        })
        .toBeGreaterThanOrEqual(4);
      state.fail = true;
      await dialog.getByRole('button', { name: '保存修改', exact: true }).click();
      await expect(dialog.getByRole('alert')).toContainText('合成校验');
      await expect(field).toHaveValue('嗷嗷🤪');
      state.fail = false;
      state.saving = true;
      await dialog.getByRole('button', { name: '保存修改', exact: true }).click();
      await expect(dialog.getByRole('button', { name: '保存中…' })).toBeDisabled();
      await expect(field).toBeDisabled();
      await page.screenshot({ path: info.outputPath('suffix-saving.png') });
      await expect.poll(() => Boolean(state.releaseSave)).toBe(true);
      state.releaseSave!();
      state.saving = false;
      await expect(dialog.getByRole('button', { name: '修改信息', exact: true })).toBeVisible();
      await dialog.getByRole('button', { name: '修改信息', exact: true }).click();
      await expect(field).toHaveValue('嗷嗷🤪');
      await field.fill('');
      await dialog.getByRole('button', { name: '保存修改', exact: true }).click();
      await expect(dialog.getByRole('button', { name: '修改信息', exact: true })).toBeVisible();
      await dialog.getByRole('button', { name: '修改信息', exact: true }).click();
      await expect(field).toHaveValue('');
      await field.scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath('suffix-empty.png') });
      expect(await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await dialog.getByRole('button', { name: '取消', exact: true }).click();
      await dialog.getByRole('button', { name: '关闭个人资料', exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
