import { expect, test, type Route } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { openMessageActions } from './chat-message-actions';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: compact bubble actions and report lifecycle`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode, 'admin');
      const mobile = page.viewportSize()!.width <= 760;
      let reasons: Route | undefined;
      let submitted: Route | undefined;
      await page.route('**/api/report/reasons', (route) => {
        reasons = route;
      });
      await page.route('**/api/report/add', (route) => {
        submitted = route;
      });
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('保留草稿');
      fixture.push('1', '测试气泡操作');
      fixture.push('2', '下一条合成消息', true);
      const row = page.locator('[data-message-id="1"]');
      const bubble = row.getByRole('group', { name: '合成岛友的消息', exact: true });
      const toolbar = row.locator('[data-message-actions="true"]');
      await expect(bubble).toBeVisible();
      await bubble.scrollIntoViewIfNeeded();
      if ((await row.getAttribute('data-presentation')) !== 'worksheet') {
        const next = page.locator('[data-message-id="2"]');
        await expect(next).toBeVisible();
        const gap =
          (await next.evaluate(
            (element) =>
              element.getBoundingClientRect().top +
              Number.parseFloat(getComputedStyle(element).paddingTop),
          )) -
          ((await bubble.boundingBox())!.y + (await bubble.boundingBox())!.height);
        expect(gap).toBeGreaterThanOrEqual(mobile ? 0 : 26);
        expect(gap).toBeLessThanOrEqual(mobile ? 58 : 36);
      }
      if (!mobile) {
        await page.mouse.move(0, 0);
        await expect(toolbar.locator('..')).toHaveCSS('opacity', '0');
        const before = await row.boundingBox();
        await bubble.hover();
        await expect(toolbar.locator('..')).toHaveCSS('opacity', '1');
        expect((await row.boundingBox())!.height).toBe(before!.height);
      }
      if (mobile) await expect(toolbar).toBeHidden();
      for (const name of mobile ? [] : ['复读', '引用', '举报', '撤回']) {
        const button = toolbar.getByRole('button', { name, exact: true });
        await expect(button).toBeVisible();
        expect((await button.boundingBox())!.height).toBe(mobile ? 44 : 26);
        await expect(button).toHaveCSS('border-top-width', '0px');
        await expect(button).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        await expect(button.locator('svg')).toHaveAttribute('width', '14');
      }
      await page.screenshot({ path: info.outputPath('compact-actions.png') });
      const action = async (name: string) => {
        if (mobile) {
          const menu = await openMessageActions(page, '1');
          await menu.getByRole('menuitem', { name, exact: true }).tap();
        } else await toolbar.getByRole('button', { name, exact: true }).click();
      };
      await action('引用');
      await expect(page.getByRole('region', { name: '引用消息', exact: true })).toContainText(
        '测试气泡操作',
      );
      await expect(draft).toHaveText('保留草稿');
      await expect(draft).toBeFocused();
      await page.getByRole('button', { name: '取消引用', exact: true }).click();
      if (!mobile) await bubble.hover();
      if (mobile) await openMessageActions(page, '1');
      else await toolbar.getByRole('button', { name: '更多消息操作' }).click();
      await expect(page.getByRole('menu')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(bubble).toBeFocused();
      await action('举报');
      const dialog = page.getByRole('dialog', { name: '举报消息', exact: true });
      await expect(dialog.getByRole('status')).toContainText('加载举报原因');
      await expect.poll(() => !!reasons).toBe(true);
      await reasons!.fulfill({ json: { code: 50000 } });
      await expect(dialog.getByRole('alert')).toContainText('加载失败');
      reasons = undefined;
      await dialog.getByRole('button', { name: '重试加载' }).click();
      await expect.poll(() => !!reasons).toBe(true);
      await reasons!.fulfill({ json: { code: 0, data: [] } });
      await expect(dialog).toContainText('暂无可用举报原因');
      reasons = undefined;
      await dialog.getByRole('button', { name: '重试加载' }).click();
      await expect.poll(() => !!reasons).toBe(true);
      await reasons!.fulfill({ json: { code: 0, data: [{ value: 1, text: '违法违规' }] } });
      await dialog.getByRole('combobox', { name: '举报原因' }).click();
      await page.getByRole('option', { name: '违法违规' }).click();
      await dialog.getByRole('textbox', { name: '补充说明（选填）' }).fill('合成说明');
      await dialog.getByRole('button', { name: '提交举报' }).click();
      await expect(dialog.getByRole('button', { name: '提交中', exact: true })).toBeDisabled();
      await expect.poll(() => !!submitted).toBe(true);
      expect(submitted!.request().postDataJSON()).toEqual({
        targetId: '1',
        targetUserId: '456',
        reportType: 1,
        reasonType: 1,
        description: '合成说明',
      });
      await submitted!.fulfill({ json: { code: 50000, message: '合成提交失败' } });
      await expect(dialog.getByRole('alert')).toHaveText('合成提交失败');
      await expect(dialog.getByRole('textbox')).toHaveValue('合成说明');
      await page.screenshot({ path: info.outputPath('report-error.png') });
      const scroll = dialog.getByRole('region', { name: '举报表单' });
      expect(await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      submitted = undefined;
      await dialog.getByRole('button', { name: '提交举报' }).click();
      await expect.poll(() => !!submitted).toBe(true);
      await submitted!.fulfill({ json: { code: 0, data: '9007199254740993' } });
      await expect(dialog).toHaveCount(0);
      await expect(bubble).toBeFocused();
      await expect(page.getByText('举报已提交，我们会尽快处理', { exact: true })).toBeVisible();
      await expect(draft).toHaveText('保留草稿');
      await action('撤回');
      if (mobile) {
        const menu = await openMessageActions(page, '1');
        await expect(menu.getByRole('menuitem', { name: '等待撤回确认…' })).toBeDisabled();
        await page.keyboard.press('Escape');
      } else
        await expect(toolbar.getByRole('button', { name: '撤回', exact: true })).toBeDisabled();
      fixture.revoke('1');
      await expect(bubble).toHaveText('消息已撤回');
      await expect(toolbar).toHaveCount(0);
      expect(fixture.stats()).toMatchObject({ connections: 1, historyRequests: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
