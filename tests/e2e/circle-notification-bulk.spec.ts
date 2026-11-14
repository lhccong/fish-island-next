import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setup, noOverflow } from './fish-circle-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: full count, single read and all actions`, async ({ page }, info) => {
      test.setTimeout(90000);
      await page.addInitScript(
        ({ id, mode }) => {
          localStorage.setItem('fish-island:skin', id);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { id: skin.id, mode },
      );
      await setup(page);
      let count = 105;
      let deleted = false;
      let failure = false;
      let listFailure = false;
      let countFailure = false;
      let delay = 0;
      let listGate: Promise<void> | null = null;
      let releaseList: (() => void) | undefined;
      const readIds = new Set<string>();
      const actions: string[] = [];
      const pages: number[] = [];
      await page.route('**/api/event_remind/**', async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith('/count'))
          return route.fulfill(
            countFailure ? { status: 503, body: '' } : { json: { code: 0, data: String(count) } },
          );
        const body = route.request().postDataJSON();
        if (path.endsWith('/page')) {
          pages.push(body.current);
          if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
          if (listGate) await listGate;
          if (listFailure) return route.fulfill({ status: 503, body: '' });
          const start = (body.current - 1) * 10;
          return route.fulfill({
            json: {
              code: 0,
              data: {
                total: deleted ? 0 : 105,
                records: deleted
                  ? []
                  : Array.from({ length: Math.min(10, 105 - start) }, (_, i) => ({
                      id: String(start + i + 1),
                      state: count === 0 || readIds.has(String(start + i + 1)) ? 1 : 0,
                      action: 'system',
                      sourceType: 0,
                      sourceId: '-1',
                      senderUser: { userName: `合成通知 ${start + i + 1}` },
                      sourceContent: '一条合成测试通知',
                    })),
              },
            },
          });
        }
        actions.push(path);
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        if (failure) return route.fulfill({ json: { code: 40000, message: '操作失败，请重试' } });
        if (path.endsWith('/batch/read')) {
          expect(body.ids).toEqual(['1']);
          readIds.add('1');
          count--;
        } else {
          expect(body).toEqual({});
          count = 0;
          if (path.endsWith('/all/delete')) deleted = true;
        }
        return route.fulfill({ json: { code: 0, data: true } });
      });
      const bell = page.getByRole('button', { name: '消息通知', exact: true });
      await bell.click();
      await expect(bell.getByLabel('105 条未读通知')).toHaveText('99+');
      const mobile = page.viewportSize()!.width <= 760;
      if (!mobile)
        await expect(
          page.getByRole('link', { name: '鱼小圈', exact: true }).getByLabel('105 条未读通知'),
        ).toBeVisible();
      const panel = page.getByRole('dialog', { name: '全部互动消息', exact: true });
      const list = panel.getByRole('region', { name: '互动消息列表', exact: true });
      await panel.getByText('合成通知 1', { exact: true }).click();
      expect(actions.filter((p) => p.endsWith('/set/read'))).toHaveLength(0);
      await page.getByRole('button', { name: '返回鱼小圈', exact: true }).click();
      await expect(bell.getByLabel('104 条未读通知')).toHaveText('99+');
      await bell.click();
      await expect(panel.getByText('合成通知 2', { exact: true })).toBeVisible();
      const menu = async (name: string) => {
        const trigger = panel.getByRole('button', { name: '更多通知操作' });
        if (mobile) await trigger.tap();
        else await trigger.click();
        const action = page.getByRole('menuitem', { name, exact: true });
        const box = await action.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
        if (mobile) await action.tap();
        else await action.click();
      };
      // Bulk read must not enumerate unloaded pages, including failure/retry.
      const before = pages.length;
      failure = true;
      await menu('全部已读');
      await expect(panel.getByRole('alert')).toHaveText('操作失败，请重试');
      await expect(bell.getByLabel('104 条未读通知')).toHaveText('99+');
      failure = false;
      await menu('全部已读');
      await expect(panel.getByText('全部消息已标为已读', { exact: true })).toBeVisible();
      await expect(bell.locator('span[aria-label]')).toHaveCount(0);
      await expect.poll(() => pages.length).toBe(before + 1);
      await expect(panel.getByText('合成通知 1', { exact: true })).toBeVisible();
      await expect(panel.locator('[data-unread="true"]')).toHaveCount(0);
      // Scroll real viewport to fetch another page after all-read.
      const listBox = (await list.boundingBox())!;
      if (mobile) {
        const cdp = await page.context().newCDPSession(page);
        for (let swipe = 0; swipe < 4; swipe++) {
          const point = { x: listBox.x + listBox.width / 2, y: listBox.y + listBox.height - 20 };
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
          for (let step = 1; step <= 6; step++)
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x: point.x, y: point.y - (step * (listBox.height - 40)) / 6 }],
            });
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        }
        await cdp.detach();
      } else {
        await list.hover();
        await page.mouse.wheel(0, 1300);
      }
      await expect.poll(() => pages.includes(2)).toBe(true);
      const scrollbar = panel.locator('[data-orientation="vertical"]');
      if (mobile) await expect(scrollbar).toHaveCSS('visibility', 'hidden');
      else {
        await list.hover();
        await expect(scrollbar).toHaveCSS('opacity', '1');
        const rail = (await scrollbar.boundingBox())!;
        const rows = panel.locator('[data-unread]');
        const first = (await rows.first().boundingBox())!;
        expect(rail.x + rail.width - first.x - first.width).toBeGreaterThanOrEqual(24);
      }
      await expect(panel.locator('[data-unread="true"]')).toHaveCount(0);
      await list.evaluate((el) => {
        el.scrollTop = 0;
      });
      await menu('全部删除');
      await expect(panel.getByText('删除全部通知？包含未加载消息，删除后无法恢复。')).toBeVisible();
      await panel.getByRole('button', { name: '取消', exact: true }).click();
      expect(deleted).toBe(false);
      await menu('全部删除');
      failure = true;
      await panel.getByRole('button', { name: '确认删除', exact: true }).click();
      await expect(panel.getByRole('alert')).toHaveText('操作失败，请重试');
      expect(deleted).toBe(false);
      await expect(panel.getByText('合成通知 1', { exact: true })).toBeVisible();
      await noOverflow(page);
      const confirm = panel.getByRole('button', { name: '确认删除', exact: true });
      expect((await confirm.boundingBox())!.height).toBeGreaterThanOrEqual(mobile ? 44 : 32);
      await page.screenshot({ path: info.outputPath('delete-confirm-error.png') });
      failure = false;
      delay = 200;
      await confirm.click();
      await expect(panel.getByText('正在处理通知…')).toBeVisible();
      await expect(panel.getByText('暂无互动消息')).toBeVisible();
      await expect(panel.getByText('通知已删除', { exact: true })).toBeVisible();
      expect(deleted).toBe(true);
      delay = 300;
      listFailure = true;
      countFailure = true;
      listGate = new Promise<void>((resolve) => {
        releaseList = resolve;
      });
      await menu('刷新消息通知');
      await expect(panel.getByText('正在加载消息通知…')).toBeVisible();
      releaseList?.();
      listGate = null;
      await expect(panel.getByRole('button', { name: '重试通知' })).toBeVisible();
      await expect(panel.getByText('未读数暂不可用，刷新消息通知可重试。')).toBeVisible();
      listFailure = false;
      countFailure = false;
      delay = 0;
      await menu('刷新消息通知');
      await expect(panel.getByText('暂无互动消息')).toBeVisible();
      await expect(panel.getByRole('alert')).toHaveCount(0);
      await noOverflow(page);
      const dimensions = await list.evaluate((el) => ({
        scroll: el.scrollWidth,
        width: el.clientWidth,
      }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
      await page.keyboard.press('Escape');
      await expect(bell).toBeFocused();
    });
  }
