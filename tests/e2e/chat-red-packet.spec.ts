import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { openMessageActions } from './chat-message-actions';
import { setupRecordAvatars, expectRecordAvatarsAndTitles } from './red-packet-record-assertions';

test.setTimeout(90000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: packet states, claims and records`, async ({ page }, info) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const fixture = await setupChatMenu(page, skin.id, mode);
      const mobile = page.viewportSize()!.width <= 760;
      const act = async (target: Locator) => {
        await target.scrollIntoViewIfNeeded();
        if (mobile) await target.tap();
        else await target.click();
      };
      await setupRecordAvatars(page);
      let detailCalls = 0;
      let failDetail = true;
      let grabs = 0;
      let recordCalls = 0;
      let releaseDetail!: () => void;
      let releaseRecords!: () => void;
      let releaseGrab!: () => void;
      const detailGate = new Promise<void>((resolve) => {
        releaseDetail = resolve;
      });
      const recordsGate = new Promise<void>((resolve) => {
        releaseRecords = resolve;
      });
      const grabGate = new Promise<void>((resolve) => {
        releaseGrab = resolve;
      });
      await page.route('**/api/redpacket/**', async (route) => {
        const url = new URL(route.request().url());
        const id = url.searchParams.get('redPacketId');
        if (url.pathname.endsWith('/detail')) {
          detailCalls++;
          if (id === 'rpc_main' && failDetail) {
            await detailGate;
            await route.fulfill({ json: { code: 50000, message: '合成详情失败' } });
            return;
          }
          await route.fulfill({
            json: {
              code: 0,
              data: {
                name:
                  id === 'rpc_quiz'
                    ? '合成题目：摸鱼岛的吉祥物是什么？'.repeat(3)
                    : '合成祝福，开心摸鱼',
                type: id === 'rpc_quiz' ? 3 : 1,
                status: id === 'rpc_expired' ? 2 : id === 'rpc_empty' ? 1 : 0,
                remainingCount: id === 'rpc_empty' ? 0 : 2,
              },
            },
          });
        } else if (url.pathname.endsWith('/records')) {
          recordCalls++;
          if (recordCalls === 1) {
            await recordsGate;
            await route.fulfill({ json: { code: 50000, message: '合成记录失败' } });
          } else
            await route.fulfill({
              json: {
                code: 0,
                data:
                  recordCalls === 2
                    ? []
                    : Array.from({ length: 25 }, (_, index) => ({
                        id: `synthetic-${index}`,
                        userName: `合成岛友${index}`,
                        userAvatar:
                          index === 0
                            ? 'https://records.test/avatar.png'
                            : index === 1
                              ? 'https://records.test/broken.png'
                              : null,
                        amount: 25 - index,
                        grabTime: '2026-11-13T01:00:00Z',
                      })),
              },
            });
        } else {
          expect(route.request().method()).toBe('POST');
          grabs++;
          if (id === 'rpc_quiz') {
            const answer = url.searchParams.get('answer');
            await route.fulfill({
              json: answer === '鱼' ? { code: 0, data: 8 } : { code: 50000, message: '答案错误' },
            });
          } else if (grabs === 1)
            await route.fulfill({ json: { code: 50000, message: '合成领取失败，请重试' } });
          else {
            await grabGate;
            await route.fulfill({ json: { code: 0, data: 6 } });
          }
        }
      });
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('保留合成草稿');
      fixture.push('1', '祝福[redpacket]rpc_main[/redpacket]后文');
      const row = page.locator('[data-message-id="1"]');
      const card = row.locator('[data-red-packet]');
      await expect(card.getByText('红包加载中…')).toBeVisible();
      await expect(card.getByRole('button', { name: '抢红包', exact: true })).toBeDisabled();
      const loadingBox = (await card.boundingBox())!;
      releaseDetail();
      await expect(card).toContainText('合成详情失败');
      failDetail = false;
      await act(card.getByRole('button', { name: '重试详情' }));
      await expect(card).toContainText('剩余 2 个');
      const readyBox = (await card.boundingBox())!;
      expect(readyBox.width).toBe(loadingBox.width);
      expect(readyBox.height).toBe(loadingBox.height);
      await expect(row).toContainText('祝福');
      await expect(row).toContainText('后文');
      await expect(row).not.toContainText('[redpacket]');
      await expect(row.getByRole('group')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      await page.screenshot({ path: info.outputPath('packet-ready.png') });
      const recordsButton = card.getByRole('button', { name: '查看记录' });
      await act(recordsButton);
      const dialog = page.getByRole('dialog', { name: '红包记录' });
      await expect(dialog.getByText('记录加载中…')).toBeVisible();
      releaseRecords();
      await expect(dialog).toContainText('合成记录失败');
      await act(dialog.getByRole('button', { name: '重试记录' }));
      await expect(dialog).toContainText('暂无人抢到红包');
      await page.keyboard.press('Escape');
      await expect(recordsButton).toBeFocused();
      await act(recordsButton);
      const scroll = dialog.getByRole('region', { name: '红包领取记录' });
      await expect(scroll.getByRole('listitem')).toHaveCount(25);
      await expectRecordAvatarsAndTitles(scroll);
      const bounds = await scroll.evaluate((element) => {
        const item = element.querySelector('li')!.getBoundingClientRect();
        const rect = element.getBoundingClientRect();
        return {
          gap: rect.right - item.right,
          top: item.top - rect.top,
          overflow: element.scrollWidth > element.clientWidth,
        };
      });
      expect(bounds.gap).toBeGreaterThanOrEqual(mobile ? 20 : 24);
      expect(bounds.top).toBeGreaterThanOrEqual(4);
      expect(bounds.overflow).toBe(false);
      if (mobile) {
        const cdp = await page.context().newCDPSession(page);
        const rect = (await scroll.boundingBox())!;
        const x = rect.x + rect.width / 2;
        const y = rect.y + rect.height - 30;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let step = 1; step <= 6; step++) {
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y - step * 30 }],
          });
          // Input timing models a deliberate drag rather than a zero-duration fling.
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
      await page.screenshot({ path: info.outputPath('records.png') });
      await scroll.focus();
      if (mobile) await scroll.getByText('合成岛友24', { exact: true }).scrollIntoViewIfNeeded();
      else await page.keyboard.press('Control+End');
      await expect(scroll.getByText('合成岛友24', { exact: true })).toBeInViewport();
      if (mobile) await scroll.getByText('合成岛友0', { exact: true }).scrollIntoViewIfNeeded();
      else await page.keyboard.press('Control+Home');
      await expect(scroll.getByText('合成岛友0', { exact: true })).toBeInViewport();
      await act(dialog.getByRole('button', { name: '关闭红包记录' }));
      await expect(recordsButton).toBeFocused();
      const grab = card.getByRole('button', { name: '抢红包', exact: true });
      await act(grab);
      await expect(card).toContainText('合成领取失败，请重试');
      await expect(grab).toBeEnabled();
      await act(grab);
      await expect(card.getByRole('button', { name: '领取中…' })).toBeDisabled();
      expect(grabs).toBe(2);
      releaseGrab();
      await expect(card).toContainText('恭喜你抢到 6 积分！');
      await expect(card.getByRole('button', { name: '已领取', exact: true })).toBeDisabled();
      const claimedBox = (await card.boundingBox())!;
      expect(claimedBox.width).toBe(readyBox.width);
      expect(claimedBox.height).toBe(readyBox.height);
      await page.screenshot({ path: info.outputPath('packet-claimed.png') });
      const menu = await openMessageActions(page, '1');
      await act(menu.getByRole('menuitem', { name: '引用', exact: true }));
      await expect(page.getByRole('region', { name: '引用消息', exact: true })).toContainText(
        '祝福[红包]后文',
      );
      await expect(draft).toHaveText('保留合成草稿');
      fixture.push('2', '[redpacket]rpc_main[/redpacket]', true);
      await expect(
        page.locator('[data-message-id="2"]').getByRole('button', { name: '已领取', exact: true }),
      ).toBeVisible();
      await expect(page.locator('[data-message-id="2"]').getByRole('group')).toHaveCSS(
        'background-color',
        'rgba(0, 0, 0, 0)',
      );
      fixture.push('3', '[redpacket]rpc_quiz[/redpacket]');
      const quiz = page.locator('[data-message-id="3"]');
      await expect(quiz.getByText('答题红包', { exact: true })).toBeVisible();
      const submit = quiz.getByRole('button', { name: '提交答案' });
      await act(submit);
      await expect(quiz).toContainText('请先输入答案');
      expect(grabs).toBe(2);
      await quiz.getByRole('textbox', { name: '红包答案' }).fill('错误');
      await act(submit);
      await expect(quiz).toContainText('答案错误');
      await quiz.getByRole('textbox', { name: '红包答案' }).fill('鱼');
      const title = quiz.getByRole('button', { name: /^查看红包完整内容/ });
      await act(title);
      const content = page.getByRole('dialog', { name: '红包祝福与题目', exact: true });
      await expect(content.getByRole('region', { name: '红包完整内容' })).toContainText(
        '合成题目：摸鱼岛的吉祥物是什么？'.repeat(3),
      );
      await page.keyboard.press('Escape');
      await expect(title).toBeFocused();
      const quizBox = (await quiz.locator('[data-red-packet]').boundingBox())!;
      if (!mobile) {
        const calls = detailCalls;
        await page.getByRole('button', { name: '切换主题', exact: true }).click();
        const picker = page.getByRole('dialog', { name: '主题模式' });
        await picker
          .getByRole('button', { name: mode === 'light' ? '暗夜模式' : '明亮模式', exact: true })
          .click();
        await picker
          .getByRole('button', { name: skin.id === 'wps' ? '微信绿' : 'WPS 表格', exact: true })
          .click();
        await page.keyboard.press('Escape');
        await expect(quiz.getByRole('textbox', { name: '红包答案' })).toHaveValue('鱼');
        await expect(draft).toHaveText('保留合成草稿');
        expect(detailCalls).toBe(calls);
        expect(fixture.stats().connections).toBe(1);
      }
      await act(submit);
      await expect(quiz).toContainText('恭喜你抢到 8 积分！');
      await expect(quiz.getByRole('textbox', { name: '红包答案' })).toBeDisabled();
      const quizClaimedBox = (await quiz.locator('[data-red-packet]').boundingBox())!;
      expect(quizClaimedBox.width).toBe(quizBox.width);
      expect(quizClaimedBox.height).toBe(quizBox.height);
      for (const [id, packet, status] of [
        ['4', 'rpc_empty', '已抢完'],
        ['5', 'rpc_expired', '已过期'],
      ]) {
        fixture.push(id!, `[redpacket]${packet}[/redpacket]`);
        const ended = page.locator(`[data-message-id="${id}"]`);
        await expect(ended.getByText(status!, { exact: true })).toBeVisible();
        await expect(ended.getByRole('button', { name: '抢红包', exact: true })).toBeDisabled();
        const endedBox = (await ended.locator('[data-red-packet]').boundingBox())!;
        expect(endedBox.width).toBe(readyBox.width);
        expect(endedBox.height).toBe(readyBox.height);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(
        await page
          .getByRole('region', { name: '群聊消息区', exact: true })
          .evaluate((element) => element.scrollWidth <= element.clientWidth),
      ).toBe(true);
      // Measure mounted virtual rows atomically so a row cannot unmount between reads.
      const layouts = await page.locator('[data-red-packet]').evaluateAll((elements) =>
        elements
          .filter(
            (element) =>
              element.getBoundingClientRect().height > 0 &&
              getComputedStyle(element).visibility !== 'hidden',
          )
          .map((element) => ({
            overflow: element.scrollWidth > element.clientWidth,
            heights: Array.from(
              element.querySelectorAll('button'),
              (button) => button.getBoundingClientRect().height,
            ),
          })),
      );
      expect(layouts.length).toBeGreaterThan(0);
      for (const layout of layouts) {
        expect(layout.overflow).toBe(false);
        for (const height of layout.heights)
          expect(height).toBeGreaterThanOrEqual(mobile ? 44 : 32);
      }
      await page.screenshot({ path: info.outputPath('packets.png') });
      fixture.revoke('2');
      await expect(page.locator('[data-message-id="2"] [data-red-packet]')).toHaveCount(0);
      expect(grabs).toBe(4);
      expect(errors).toEqual([]);
    });
  }
