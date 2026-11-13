import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(90000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: create, publish, retry and recover`, async ({ page }, info) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const fixture = await setupChatMenu(page, skin.id, mode);
      const mobile = page.viewportSize()!.width <= 760;
      const act = async (locator: Locator) => {
        await locator.scrollIntoViewIfNeeded();
        if (mobile) await locator.tap();
        else await locator.click();
      };
      const creates: Array<{
        type: number;
        totalAmount: number;
        count: number;
        name: string;
        answer?: string;
      }> = [];
      const publications: Array<{ content: string; clientMessageId: string }> = [];
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('**/api/redpacket/create', async (route) => {
        expect(route.request().method()).toBe('POST');
        creates.push(route.request().postDataJSON() as (typeof creates)[number]);
        const attempt = creates.length;
        if (attempt === 1) {
          await route.fulfill({ json: { code: 50001, message: '积分不足，请调整后重试' } });
          return;
        }
        if (attempt === 2) await gate;
        await route.fulfill({
          json: { code: 0, data: attempt === 5 ? {} : `rpc_created_${attempt}` },
        });
      });
      await page.route('**/api/redpacket/detail?*', (route) =>
        route.fulfill({
          json: { code: 0, data: { type: 1, status: 0, remainingCount: 1, name: '合成红包' } },
        }),
      );
      await page.route('**/api/chat/message/send', async (route) => {
        const input = route.request().postDataJSON() as (typeof publications)[number];
        publications.push(input);
        if (publications.length === 1) {
          await route.fulfill({ json: { code: 50001, message: '合成消息发布失败' } });
          return;
        }
        await route.fulfill({
          json: {
            code: 0,
            data: {
              message: {
                id: String(100 + publications.length),
                sender: { id: '123', name: '本人合成' },
                content: input.content,
                clientMessageId: input.clientMessageId,
                timestamp: Date.now(),
              },
            },
          },
        });
      });
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('保留原有聊天草稿');
      const launcher = page.getByRole('button', { name: '发红包', exact: true });
      await expect(launcher).toHaveCSS('width', '44px');
      await act(launcher);
      const dialog = page.getByRole('dialog', { name: '发送红包', exact: true });
      const scroll = dialog.getByRole('region', { name: '发送红包表单' });
      const send = dialog.getByRole('button', { name: '发送红包', exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('textbox', { name: '总积分', exact: true })).toHaveValue('100');
      await expect(dialog.getByRole('textbox', { name: '红包个数', exact: true })).toHaveValue(
        '10',
      );
      await dialog.getByRole('textbox', { name: '总积分', exact: true }).fill('0');
      await dialog.getByRole('textbox', { name: '总积分', exact: true }).press('Enter');
      expect(creates).toHaveLength(0);
      await act(send);
      await expect(dialog.getByRole('alert')).toContainText('总积分请输入');
      await dialog.getByRole('textbox', { name: '总积分', exact: true }).fill('10');
      await dialog.getByRole('textbox', { name: '红包个数', exact: true }).fill('1');
      await dialog.getByRole('textbox', { name: '祝福语', exact: true }).fill('合成祝福');
      await act(send);
      await expect(dialog.getByRole('alert')).toContainText('积分不足');
      await act(send);
      await expect(dialog.getByRole('button', { name: '创建中…' })).toBeDisabled();
      await expect(dialog.getByRole('textbox', { name: '总积分', exact: true })).toBeDisabled();
      await act(dialog.getByRole('button', { name: '关闭发送红包' }));
      await expect(launcher).toBeFocused();
      await act(launcher);
      await expect(dialog.getByRole('button', { name: '创建中…' })).toBeDisabled();
      expect(creates).toHaveLength(2);
      release();
      await expect(dialog.getByRole('alert')).toContainText('红包已创建，消息发布失败');
      await act(dialog.getByRole('button', { name: '重试发布' }));
      await expect(dialog.getByRole('status')).toHaveText('红包发送成功');
      expect(creates).toHaveLength(2);
      expect(publications[0]).toEqual(publications[1]);
      expect(creates[1]).toEqual({ type: 1, totalAmount: 10, count: 1, name: '合成祝福' });
      await page.screenshot({ path: info.outputPath('sent.png') });
      await act(dialog.getByRole('button', { name: '完成', exact: true }));
      await expect(launcher).toBeFocused();
      await expect(page.locator('[data-message-id="102"]').getByRole('group')).toHaveCSS(
        'background-color',
        'rgba(0, 0, 0, 0)',
      );
      await act(launcher);
      await act(dialog.getByRole('button', { name: '再发一个' }));
      const choose = async (label: string) => {
        const select = dialog.getByRole('combobox', { name: '红包类型' });
        await act(select);
        await expect(page.getByRole('listbox')).toBeVisible();
        const bounds = (await page.getByRole('listbox').boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
        await act(page.getByRole('option', { name: label, exact: true }));
        await expect(select).toContainText(label);
      };
      await choose('普通红包');
      await dialog.getByRole('textbox', { name: '总积分', exact: true }).fill('20');
      await dialog.getByRole('textbox', { name: '红包个数', exact: true }).fill('2');
      await act(send);
      await expect(dialog.getByRole('status')).toHaveText('红包发送成功');
      expect(creates[2]).toMatchObject({ type: 2, totalAmount: 20, count: 2 });
      expect(creates[2]).not.toHaveProperty('answer');
      await act(dialog.getByRole('button', { name: '再发一个' }));
      await choose('答题红包');
      await dialog.getByRole('textbox', { name: '题目', exact: true }).fill('');
      await act(send);
      await expect(dialog.getByRole('alert')).toContainText('请输入答题红包的题目');
      await dialog
        .getByRole('textbox', { name: '题目', exact: true })
        .fill('合成问题：摸鱼岛的吉祥物是什么？'.repeat(3));
      await act(send);
      await expect(dialog.getByRole('alert')).toContainText('正确答案请输入');
      await dialog.getByRole('textbox', { name: '正确答案', exact: true }).fill('合成答案');
      await dialog.getByRole('textbox', { name: '正确答案', exact: true }).press('Enter');
      expect(creates).toHaveLength(3);
      const spacing = await scroll.evaluate((element) => {
        const fields = element.firstElementChild!.firstElementChild!;
        const first = fields.getBoundingClientRect();
        const rect = element.getBoundingClientRect();
        return {
          gap: rect.right - first.right,
          overflow: element.scrollWidth > element.clientWidth,
          padding: parseFloat(getComputedStyle(fields).paddingTop),
        };
      });
      expect(spacing.gap).toBeGreaterThanOrEqual(mobile ? 20 : 24);
      expect(spacing.padding).toBeGreaterThanOrEqual(4);
      expect(spacing.overflow).toBe(false);
      if (mobile) {
        await scroll.evaluate((element) => {
          element.scrollTop = 0;
        });
        const cdp = await page.context().newCDPSession(page);
        const box = (await scroll.boundingBox())!;
        const x = box.x + box.width - 10,
          y = box.y + box.height - 30;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let step = 1; step <= 6; step++) {
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y - step * 30 }],
          });
          await page.waitForTimeout(40);
        }
        await page.waitForTimeout(150);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await cdp.detach();
        await expect.poll(() => scroll.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      } else await scroll.hover();
      const track = dialog.locator('[data-orientation="vertical"]');
      if (mobile) await expect(track).toHaveCSS('visibility', 'hidden');
      else {
        await expect(track).toBeVisible();
        await expect(track).toHaveCSS('opacity', '1');
      }
      await dialog.getByRole('textbox', { name: '正确答案', exact: true }).focus();
      await expect(dialog.getByRole('textbox', { name: '正确答案', exact: true })).toBeInViewport();
      const focusSpace = await dialog
        .getByRole('textbox', { name: '正确答案', exact: true })
        .evaluate((element) => {
          const style = getComputedStyle(element);
          const viewport = element.closest('[role="region"]')!.getBoundingClientRect();
          const rect = element.getBoundingClientRect();
          return {
            ring: parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset),
            left: rect.left - viewport.left,
            right: viewport.right - rect.right,
          };
        });
      expect(focusSpace.left).toBeGreaterThanOrEqual(focusSpace.ring);
      expect(focusSpace.right).toBeGreaterThanOrEqual(mobile ? 20 : 24);
      await page.screenshot({ path: info.outputPath('quiz.png') });
      await act(dialog.getByRole('button', { name: '关闭发送红包' }));
      if (!mobile) {
        await page.getByRole('button', { name: '切换主题', exact: true }).click();
        const picker = page.getByRole('dialog', { name: '主题模式' });
        await picker
          .getByRole('button', { name: mode === 'light' ? '暗夜模式' : '明亮模式', exact: true })
          .click();
        await page.keyboard.press('Escape');
      }
      await act(launcher);
      await expect(dialog.getByRole('textbox', { name: '正确答案', exact: true })).toHaveValue(
        '合成答案',
      );
      if (!mobile) {
        await page.keyboard.press('Escape');
        await page.getByRole('button', { name: '切换主题', exact: true }).click();
        await page
          .getByRole('dialog', { name: '主题模式' })
          .getByRole('button', { name: mode === 'light' ? '明亮模式' : '暗夜模式', exact: true })
          .click();
        await page.keyboard.press('Escape');
        await act(launcher);
      }
      await act(send);
      await expect(dialog.getByRole('status')).toHaveText('红包发送成功');
      expect(creates[3]).toMatchObject({ type: 3, answer: '合成答案' });
      expect(publications).toHaveLength(4);
      expect(
        publications.every((input) =>
          /^\[redpacket\]rpc_created_\d+\[\/redpacket\]$/.test(input.content),
        ),
      ).toBe(true);
      await act(dialog.getByRole('button', { name: '再发一个' }));
      await act(send);
      await expect(dialog.getByRole('alert')).toContainText('红包创建结果未确认');
      await expect(dialog.getByRole('button', { name: '等待确认' })).toBeDisabled();
      await page.keyboard.press('Escape');
      await act(launcher);
      await expect(dialog.getByRole('button', { name: '等待确认' })).toBeDisabled();
      expect(creates).toHaveLength(5);
      expect(fixture.stats().connections).toBe(1);
      expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.keyboard.press('Escape');
      await expect(draft).toHaveValue('保留原有聊天草稿');
      expect(errors).toEqual([]);
    });
  }
