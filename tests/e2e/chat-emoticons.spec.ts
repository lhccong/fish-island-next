import { test, expect, type Route, type Page, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { openMessageActions } from './chat-message-actions';
import { verifyEmoticonPreview, openEmoticonActions } from './emoticon-actions';

test.setTimeout(60000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: emoticons save, scroll, search, draft and send`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      let saved = false;
      let listFail = false;
      let held: Route | undefined;
      let failAdd = true;
      let failRemove = true;
      let listRequests = 0;
      const pages: number[] = [];
      await page.route('**/api/emoticon_favour/add', async (route) => {
        expect(route.request().postData()).toBe('https://menu.test/image.png');
        if (failAdd) {
          failAdd = false;
          return route.fulfill({ json: { code: 50001, message: '合成收藏失败，请重试' } });
        }
        saved = true;
        return route.fulfill({ json: { code: 0, data: true } });
      });
      await page.route('**/api/emoticon_favour/delete', async (route) => {
        expect(route.request().postDataJSON()).toEqual({ id: '1' });
        if (failRemove) {
          failRemove = false;
          return route.fulfill({ json: { code: 50001, message: '合成移除失败，请重试' } });
        }
        saved = false;
        return route.fulfill({ json: { code: 0, data: true } });
      });
      await page.route('**/api/emoticon_favour/list/page', async (route) => {
        listRequests++;
        const current = (route.request().postDataJSON() as { current: number }).current;
        pages.push(current);
        if (listFail) return route.fulfill({ json: { code: 50000, message: '合成列表失败' } });
        held = route;
      });
      const open = page.getByRole('button', { name: '表情包', exact: true });
      await page.getByRole('textbox', { name: '消息草稿' }).fill('保留草稿');
      await open.click();
      const dialog = page.getByRole('dialog', { name: '表情包', exact: true });
      await expect(dialog.getByText('正在加载表情包…')).toBeVisible();
      await expect.poll(() => !!held).toBe(true);
      await held!.fulfill({ json: { code: 0, data: { records: [], total: '0' } } });
      held = undefined;
      await expect(dialog.getByText(/还没有收藏/)).toBeVisible();
      await dialog.getByRole('button', { name: '关闭表情包' }).click();
      await expect(open).toBeFocused();
      fixture.broadcast({
        id: '1794530000001',
        content: '[img]https://menu.test/image.png[/img]',
        sender: { id: '456', name: '合成岛友' },
        timestamp: Date.now() - 1000,
      });
      await openMessageActions(page, '1794530000001');
      await page.getByRole('menuitem', { name: '添加表情包', exact: true }).click();
      await expect(page.getByText('合成收藏失败，请重试')).toBeVisible();
      await openMessageActions(page, '1794530000001');
      await page.getByRole('menuitem', { name: '添加表情包', exact: true }).click();
      await expect(page.getByText('已添加到表情包')).toBeVisible();
      expect(saved).toBe(true);
      listFail = true;
      await open.click();
      await expect(dialog.getByText('合成列表失败')).toBeVisible();
      listFail = false;
      await dialog.getByRole('button', { name: '重试表情包' }).click();
      await expect.poll(() => !!held).toBe(true);
      const records = Array.from({ length: 24 }, (_, i) => ({
        id: String(i + 1),
        emoticonSrc: 'https://menu.test/image.png',
      }));
      await held!.fulfill({ json: { code: 0, data: { records, total: '25' } } });
      held = undefined;
      const scroll = dialog.getByRole('region', { name: '表情包列表' });
      await expect(dialog.getByRole('button', { name: '使用表情包 1', exact: true })).toBeVisible();
      await scrollToEnd(page, scroll);
      await expect.poll(() => !!held).toBe(true);
      await held!.fulfill({ json: { code: 50001, message: '合成追加失败' } });
      held = undefined;
      await expect(dialog.getByRole('button', { name: '重试表情包' })).toBeVisible();
      expect(await dialog.getByRole('button', { name: /^使用表情包 / }).count()).toBe(24);
      await dialog.getByRole('button', { name: '重试表情包' }).click();
      await expect.poll(() => !!held).toBe(true);
      await held!.fulfill({
        json: {
          code: 0,
          data: {
            records: [records[23], { id: '25', emoticonSrc: 'https://menu.test/image.png' }],
            total: '25',
          },
        },
      });
      held = undefined;
      await expect(dialog.getByText('已全部加载')).toBeVisible();
      expect(await dialog.getByRole('button', { name: /^使用表情包 / }).count()).toBe(25);
      expect(pages.slice(-3)).toEqual([1, 2, 2]);
      await dialog.getByRole('button', { name: '使用表情包 25', exact: true }).focus();
      await expect(
        dialog.getByRole('button', { name: '使用表情包 25', exact: true }),
      ).toBeInViewport();
      const bounds = await scroll.evaluate((el) => {
        const tile = el.querySelector('[aria-label="使用表情包 24"]')!.getBoundingClientRect();
        const view = el.getBoundingClientRect();
        return {
          horizontal: el.scrollWidth <= el.clientWidth,
          gap: view.right - tile.right,
          scrolled: el.scrollTop > 0,
        };
      });
      expect(bounds.horizontal).toBe(true);
      expect(bounds.scrolled).toBe(true);
      expect(bounds.gap).toBeGreaterThanOrEqual(page.viewportSize()!.width <= 760 ? 20 : 24);
      const count = listRequests;
      await page.screenshot({ path: info.outputPath('emoticons.png') });
      expect(listRequests).toBe(count);
      await scroll.evaluate((el) => {
        el.scrollTop = 0;
      });
      await dialog.getByRole('button', { name: '使用表情包 1', exact: true }).focus();
      await dialog.getByRole('button', { name: '使用表情包 1', exact: true }).click();
      await expect(page.getByRole('textbox', { name: '消息草稿' })).toHaveValue(
        '保留草稿[img]https://menu.test/image.png[/img]',
      );
      await page.route('**/api/chat/message/send', async (route) => {
        const data = route.request().postDataJSON() as { content: string; clientMessageId: string };
        expect(data.content).toBe('保留草稿[img]https://menu.test/image.png[/img]');
        return route.fulfill({
          json: {
            code: 0,
            data: {
              message: {
                id: '1794530000002',
                content: data.content,
                clientMessageId: data.clientMessageId,
                sender: { id: '123', name: '本人合成' },
                timestamp: Date.now(),
              },
            },
          },
        });
      });
      await page.getByRole('button', { name: '发送', exact: true }).click();
      await page.getByRole('region', { name: '群聊消息区', exact: true }).evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await expect
        .poll(async () => {
          await page.getByRole('region', { name: '群聊消息区', exact: true }).evaluate((el) => {
            el.scrollTop = el.scrollHeight;
          });
          return page.locator('[data-delivery="sent"]').count();
        })
        .toBe(1);
      await open.click();
      await expect.poll(() => !!held).toBe(true);
      await held!.fulfill({ json: { code: 0, data: { records: [records[0]], total: '1' } } });
      held = undefined;
      await verifyEmoticonPreview(page, info);
      await openEmoticonActions(page);
      await page.getByRole('menuitem', { name: '移除表情包', exact: true }).click();
      await expect(dialog.getByText('合成移除失败，请重试')).toBeVisible();
      await expect(dialog.getByRole('button', { name: '使用表情包 1', exact: true })).toBeVisible();
      await openEmoticonActions(page);
      await page.getByRole('menuitem', { name: '移除表情包', exact: true }).click();
      await expect.poll(() => !!held).toBe(true);
      await held!.fulfill({ json: { code: 0, data: { records: [], total: '0' } } });
      held = undefined;
      await expect(dialog.getByText(/还没有收藏/)).toBeVisible();
      expect(saved).toBe(false);
      let searchFail = true;
      await page.route('**/emoticon-search?**', (route) => {
        expect(route.request().headers()['synthetic-session']).toBeUndefined();
        const url = new URL(route.request().url());
        expect(url.searchParams.get('word')).toBe('开心表情');
        const offset = Number(url.searchParams.get('pn'));
        expect([0, 30]).toContain(offset);
        return route.fulfill({
          json: searchFail
            ? { data: {} }
            : {
                data: Array.from({ length: offset ? 1 : 30 }, (_, i) => ({
                  thumbURL: 'https://menu.test/thumb.png',
                  middleURL: `https://menu.test/image.png#${offset + i}`,
                })),
              },
        });
      });
      await dialog.getByRole('textbox', { name: '搜索表情包' }).fill('开心');
      await dialog.getByRole('button', { name: '搜索', exact: true }).click();
      await expect(dialog.getByRole('button', { name: '重试表情包' })).toBeVisible();
      searchFail = false;
      await dialog.getByRole('button', { name: '重试表情包' }).click();
      await expect(dialog.getByRole('button', { name: '使用表情包 1', exact: true })).toBeVisible();
      await scrollToEnd(page, dialog.getByRole('region', { name: '表情包列表' }));
      await expect(dialog.getByText('已全部加载')).toBeVisible();
      await expect(dialog.getByRole('button', { name: /^使用表情包 / })).toHaveCount(31);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.mouse.move(0, 0);
      await expect(page.getByRole('tooltip')).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      expect(fixture.stats().connections).toBe(1);
    });
  }

async function scrollToEnd(page: Page, scroll: Locator) {
  const box = (await scroll.boundingBox())!;
  if (page.viewportSize()!.width > 760) {
    await scroll.hover();
    await page.mouse.wheel(0, 5000);
  } else {
    const session = await page.context().newCDPSession(page);
    for (let swipe = 0; swipe < 6; swipe++) {
      const x = box.x + box.width / 2;
      const start = box.y + box.height - 16;
      const distance = box.height - 32;
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y: start }],
      });
      for (let step = 1; step <= 5; step++)
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y: start - (distance * step) / 5 }],
        });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await session.detach();
  }
  await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
}
