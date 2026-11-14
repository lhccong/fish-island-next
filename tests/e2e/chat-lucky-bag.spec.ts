import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { assertArea } from './lucky-bag-assertions';

test.setTimeout(90000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: send, participate, records and active bags`, async ({
      page,
    }, info) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const fixture = await setupChatMenu(page, skin.id, mode);
      const mobile = page.viewportSize()!.width <= 760;
      const act = async (target: Locator) => {
        await target.scrollIntoViewIfNeeded();
        if (mobile) await target.tap();
        else await target.click();
      };
      const bag = {
        id: 'lb_synthetic',
        name: '合成摸鱼福袋',
        creatorName: '合成岛友',
        totalAmount: 50,
        winnerCount: 5,
        participantCount: 2,
        type: 1,
        status: 0,
        joined: false,
        drawTime: new Date(Date.now() + 180000).toISOString(),
      };
      let creates = 0,
        joins = 0,
        active = 0,
        details = 0,
        sends = 0;
      let detailError = false;
      let recordState: string = 'error';
      let activeState: string = 'error';
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('**/api/chat/message/send', async (route) => {
        sends++;
        await route.fulfill({ json: { code: 50001 } });
      });
      await page.route('**/api/luckybag/create', async (route) => {
        creates++;
        const input = route.request().postDataJSON() as Record<string, unknown>;
        expect(route.request().method()).toBe('POST');
        expect(input).toMatchObject({
          type: 2,
          totalAmount: 50,
          winnerCount: 5,
          durationSeconds: 180,
        });
        if (creates === 1)
          return route.fulfill({ json: { code: 50001, message: '积分不足，请重试' } });
        if (creates === 2) {
          await gate;
          fixture.push('901', `合成岛友创建了一个福袋快来参加吧[luckybag]${bag.id}[/luckybag]`);
          return route.fulfill({ json: { code: 0, data: bag } });
        }
        return route.fulfill({ json: { code: 0, data: {} } });
      });
      await page.route('**/api/luckybag/detail?*', async (route) => {
        details++;
        return route.fulfill({
          json: detailError
            ? { code: 50001, message: '详情读取失败，请重试' }
            : { code: 0, data: bag },
        });
      });
      await page.route('**/api/luckybag/join?*', async (route) => {
        joins++;
        expect(new URL(route.request().url()).searchParams.get('luckyBagId')).toBe(bag.id);
        expect(route.request().method()).toBe('POST');
        if (joins === 1)
          return route.fulfill({ json: { code: 50001, message: '参与失败，请重试' } });
        bag.joined = true;
        bag.participantCount++;
        return route.fulfill({ json: { code: 0, data: true } });
      });
      await page.route('**/api/luckybag/records?*', async (route) => {
        if (recordState === 'error')
          return route.fulfill({ json: { code: 50001, message: '记录读取失败' } });
        return route.fulfill({
          json: {
            code: 0,
            data:
              recordState === 'empty'
                ? []
                : Array.from({ length: 20 }, (_, index) => ({
                    id: `record_${index}`,
                    userName: `合成中奖岛友${index}`,
                    amount: index + 1,
                    winTime: new Date().toISOString(),
                  })),
          },
        });
      });
      await page.route('**/api/luckybag/active', async (route) => {
        active++;
        if (activeState === 'error')
          return route.fulfill({ json: { code: 50001, message: '列表读取失败' } });
        return route.fulfill({ json: { code: 0, data: activeState === 'empty' ? [] : [bag] } });
      });
      await page.route('https://oss.cqbo.com/moyu/fudai.jpg', (route) =>
        route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#be2535"/><text x="18" y="44" fill="white" font-size="32">福</text></svg>',
        }),
      );
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('保留福袋测试草稿');
      if (mobile) await act(page.getByRole('button', { name: '更多聊天工具' }));
      const launcher = page.getByRole('button', { name: '发福袋', exact: true });
      await expect(launcher).toHaveCSS('width', '44px');
      await act(launcher);
      const sendDialog = page.getByRole('dialog', { name: '发送福袋', exact: true });
      const formScroll = sendDialog.getByRole('region', { name: '发送福袋表单' });
      const send = sendDialog.getByRole('button', { name: '发送福袋', exact: true });
      await sendDialog.getByRole('textbox', { name: '总积分', exact: true }).fill('0');
      await act(send);
      await expect(sendDialog.getByRole('alert')).toContainText('总积分请输入');
      expect(creates).toBe(0);
      await sendDialog.getByRole('textbox', { name: '总积分', exact: true }).fill('50');
      await act(sendDialog.getByRole('combobox', { name: '福袋分配方式' }));
      await expect(page.getByRole('listbox')).toBeVisible();
      const bounds = (await page.getByRole('listbox').boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      await page.getByRole('option', { name: '平均分配', exact: true }).focus();
      await page.getByRole('option', { name: '平均分配', exact: true }).press('Enter');
      await expect(sendDialog.getByRole('combobox')).toContainText('平均分配');
      await sendDialog.getByRole('textbox', { name: '福袋名称' }).fill('合成摸鱼福袋');
      await act(send);
      await expect(sendDialog.getByRole('alert')).toContainText('积分不足');
      await act(send);
      await expect(sendDialog.getByRole('button', { name: '发送中…' })).toBeDisabled();
      await act(sendDialog.getByRole('button', { name: '关闭福袋面板' }));
      await expect(launcher).toBeFocused();
      await act(launcher);
      await expect(sendDialog.getByRole('button', { name: '发送中…' })).toBeDisabled();
      release();
      await expect(sendDialog.getByRole('status')).toContainText('福袋发送成功');
      expect(creates).toBe(2);
      expect(sends).toBe(0);
      await assertArea(formScroll, mobile);
      await page.screenshot({ path: info.outputPath('send.png') });
      await act(sendDialog.getByRole('button', { name: '完成', exact: true }));
      const card = page
        .locator('[data-message-id="901"]')
        .getByRole('button', { name: '查看福袋：合成摸鱼福袋' });
      await expect(card).toBeVisible();
      const prefix = page
        .locator('[data-message-id="901"]')
        .getByText('合成岛友创建了一个福袋快来参加吧', { exact: true });
      const prefixBox = (await prefix.boundingBox())!;
      const cardBox = (await card.boundingBox())!;
      expect(cardBox.y).toBeGreaterThanOrEqual(prefixBox.y + prefixBox.height + 6);
      expect(cardBox.width).toBeLessThanOrEqual(mobile ? 250 : 272);
      expect(Math.abs(cardBox.x - prefixBox.x)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: info.outputPath('message-card.png') });
      detailError = true;
      await act(card);
      const detail = page.getByRole('dialog', { name: '福袋详情', exact: true });
      await expect(detail.getByRole('alert')).toContainText('详情读取失败');
      detailError = false;
      await act(detail.getByRole('button', { name: '刷新详情' }));
      const join = detail.getByRole('button', { name: '参与福袋' });
      await act(join);
      await expect(detail.getByRole('alert')).toContainText('参与失败');
      await act(join);
      await expect(detail.getByRole('status').filter({ hasText: '参与成功' })).toBeVisible();
      await expect(detail.getByRole('button', { name: '已参与', exact: true })).toBeDisabled();
      expect(joins).toBe(2);
      await page.screenshot({ path: info.outputPath('detail-top.png') });
      await act(detail.getByRole('button', { name: '中奖记录', exact: true }));
      await expect(detail.getByRole('alert').filter({ hasText: '记录读取失败' })).toBeVisible();
      recordState = 'empty';
      await act(detail.getByRole('button', { name: '重试记录' }));
      await expect(detail.getByText('暂无中奖记录，未开奖时请稍后刷新。')).toBeVisible();
      recordState = 'success';
      await act(detail.getByRole('button', { name: '刷新记录' }));
      await expect(
        detail.getByRole('listitem').filter({ hasText: '合成中奖岛友19' }),
      ).toBeVisible();
      const detailScroll = detail.getByRole('region', { name: '福袋详情内容' });
      await assertArea(detailScroll, mobile);
      await detailScroll.hover();
      if (mobile) {
        await detailScroll.evaluate((element) => {
          element.scrollTop = 0;
        });
        const cdp = await page.context().newCDPSession(page);
        const rect = (await detailScroll.boundingBox())!;
        const x = rect.x + rect.width - 12,
          y = rect.y + rect.height - 30;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let step = 1; step <= 6; step++) {
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y - step * 25 }],
          });
          await page.waitForTimeout(40);
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await cdp.detach();
        await expect
          .poll(() => detailScroll.evaluate((element) => element.scrollTop))
          .toBeGreaterThan(0);
        await expect(detail.locator('[data-orientation="vertical"]')).toHaveCSS(
          'visibility',
          'hidden',
        );
      } else {
        await expect(detail.locator('[data-orientation="vertical"]')).toHaveCSS('opacity', '1');
      }
      await detailScroll.focus();
      await page.keyboard.press('End');
      await detail.getByRole('button', { name: '刷新记录' }).focus();
      await expect(detail.getByRole('button', { name: '刷新记录' })).toBeInViewport();
      await page.screenshot({ path: info.outputPath('records-bottom.png') });
      bag.drawTime = new Date(Date.now() - 1000).toISOString();
      await act(detail.getByRole('button', { name: '刷新详情' }));
      await expect(detail.getByText('等待开奖，请刷新详情 · 已参与')).toBeVisible();
      bag.status = 1;
      await act(detail.getByRole('button', { name: '刷新详情' }));
      await expect(detail.getByText('已开奖 · 已参与')).toBeVisible();
      bag.status = 2;
      await act(detail.getByRole('button', { name: '刷新详情' }));
      await expect(detail.getByText('已过期 · 已参与')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(card).toBeFocused();
      const listLauncher = page.getByRole('button', { name: '进行中的福袋', exact: true });
      await act(listLauncher);
      const list = page.getByRole('dialog', { name: '进行中的福袋', exact: true });
      await expect(list.getByRole('alert')).toContainText('列表读取失败');
      activeState = 'empty';
      await act(list.getByRole('button', { name: '重试列表' }));
      await expect(list.getByText('暂无进行中的福袋，可以发送一个邀请岛友参与。')).toBeVisible();
      activeState = 'success';
      bag.status = 0;
      bag.drawTime = new Date(Date.now() + 180000).toISOString();
      await act(list.getByRole('button', { name: '刷新列表' }));
      await act(list.getByRole('button', { name: '查看福袋：合成摸鱼福袋' }));
      await expect(detail).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(list.getByRole('button', { name: '查看福袋：合成摸鱼福袋' })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(listLauncher).toBeFocused();
      const counts = { details, active, creates };
      if (mobile) await act(page.getByRole('link', { name: '返回热榜', exact: true }));
      await page.getByRole('button', { name: '切换主题', exact: true }).click();
      const picker = page.getByRole('dialog', { name: '主题模式' });
      await picker
        .getByRole('button', { name: mode === 'light' ? '暗夜模式' : '明亮模式', exact: true })
        .click();
      await picker
        .getByRole('button', { name: skin.id === 'wps' ? '微信绿' : 'WPS 表格', exact: true })
        .click();
      await page.keyboard.press('Escape');
      if (mobile) {
        await act(
          page
            .getByRole('navigation', { name: '主要功能', exact: true })
            .getByRole('link', { name: '聊天', exact: true }),
        );
        await act(page.getByRole('button', { name: '更多聊天工具' }));
      }
      expect({ details, active, creates }).toEqual(counts);
      await act(launcher);
      await act(sendDialog.getByRole('button', { name: '再发一个' }));
      expect(creates).toBe(2);
      await act(sendDialog.getByRole('combobox'));
      await act(page.getByRole('option', { name: '平均分配' }));
      await act(send);
      await expect(sendDialog.getByRole('alert')).toContainText('福袋创建结果未确认');
      await expect(sendDialog.getByRole('button', { name: '等待确认' })).toBeDisabled();
      await page.keyboard.press('Escape');
      await act(launcher);
      await expect(sendDialog.getByRole('button', { name: '等待确认' })).toBeDisabled();
      expect(creates).toBe(3);
      expect(sends).toBe(0);
      await page.keyboard.press('Escape');
      await expect(draft).toHaveText('保留福袋测试草稿');
      expect(fixture.stats().connections).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(errors).toEqual([]);
    });
  }
