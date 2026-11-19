import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.use({ serviceWorkers: 'block' });

async function startDrag(page: Page, handle: Locator, touch?: CDPSession) {
  const box = (await handle.boundingBox())!;
  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + box.height / 2);
  if (touch) {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    return {
      move: (y: number) =>
        touch.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y: Math.round(y) }],
        }),
      end: async (cancel = false) => {
        await touch.send('Input.dispatchTouchEvent', {
          type: cancel ? 'touchCancel' : 'touchEnd',
          touchPoints: [],
        });
      },
    };
  }
  await page.mouse.move(x, y);
  await page.mouse.down();
  return {
    move: (y: number) => page.mouse.move(x, y, { steps: 4 }),
    end: async (cancel = false) => {
      if (cancel) await page.mouse.move(0, y);
      await page.mouse.up();
    },
  };
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: edit and reorder default conversations`, async ({ page }, info) => {
      test.setTimeout(90_000);
      const mobile = page.viewportSize()!.width <= 760;
      const popup = mobile || ['wps', 'moyu-island', 'pixel-island'].includes(skin.id);
      const activate = (control: Locator) => (mobile ? control.tap() : control.click());
      let phase: 'loading' | 'error' | 'empty' | 'success' = 'error';
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      let requests = 0;
      const members = Array.from({ length: 25 }, (_, index) => ({
        id: String(index + 1),
        name: `测试成员 ${index}`,
        avatar:
          index === 0
            ? 'https://menu.test/image.png'
            : index === 1
              ? 'https://avatars.test/broken.png'
              : null,
      }));
      const fixture = await setupChatMenu(
        page,
        skin.id,
        mode,
        'user',
        async () => {
          await page.route('https://avatars.test/broken.png', (route) =>
            route.fulfill({ status: 404 }),
          );
          await page.route('**/api/chat/online/user', async (route) => {
            requests++;
            if (phase === 'loading') await pending;
            await route.fulfill({
              status: phase === 'error' ? 503 : 200,
              json: { code: 0, data: phase === 'success' ? members : [] },
            });
          });
        },
        false,
      );
      const openList = async () => {
        if (popup) await activate(page.getByRole('button', { name: '查看聊天列表', exact: true }));
      };
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('保留消息草稿');
      await openList();
      const trigger = page.getByRole('button', { name: '编辑聊天列表', exact: true });
      const editor = page.getByRole('dialog', { name: '编辑聊天列表', exact: true });
      const list = page.getByRole('region', { name: '聊天列表滚动区' });
      const toggle = (name: string) =>
        editor.getByRole('button', { name: `编辑${name}`, exact: true });
      await activate(trigger);
      await expect(editor.getByRole('alert')).toContainText('暂时无法加载列表');
      phase = 'loading';
      await activate(editor.getByRole('button', { name: '重试', exact: true }));
      await expect(editor.getByRole('status')).toHaveText('正在加载列表…');
      await expect(editor.getByRole('status').locator('svg')).toBeVisible();
      phase = 'empty';
      release();
      await expect(editor.getByRole('status')).toHaveText('暂无可编辑的对话');
      phase = 'success';
      await activate(editor.getByRole('button', { name: '刷新列表', exact: true }));
      const items = editor.getByRole('listitem');
      await expect(items).toHaveCount(30);
      const baseline = fixture.stats();
      const first = items.first();
      const second = items.nth(1);
      await expect(first.locator('img')).toHaveJSProperty('naturalWidth', 320);
      await expect(second.locator('[data-size="list"]')).toHaveText('测');
      await expect(toggle('服务号').locator('[data-kind="service"] svg')).toBeAttached();
      const handle = editor.getByRole('button', { name: '排序测试成员 1', exact: true });
      const handleBox = (await handle.boundingBox())!;
      expect(handleBox.width).toBeGreaterThanOrEqual(mobile ? 44 : 32);
      expect(handleBox.height).toBeGreaterThanOrEqual(mobile ? 44 : 32);
      const target = (await first.boundingBox())!;
      const touch = mobile ? await page.context().newCDPSession(page) : undefined;
      const drag = await startDrag(page, handle, touch);
      await drag.move(target.y + target.height / 4);
      await expect(first).toHaveAttribute('data-drop-edge', 'before');
      await expect(second).toHaveAttribute('data-dragging', 'true');
      await drag.end();
      await expect(items.first()).toContainText('测试成员 1');
      const region = editor.getByRole('region', { name: '列表设置滚动区' });
      if (skin.id === 'wechat') {
        const viewport = (await region.boundingBox())!;
        const edgeDrag = await startDrag(page, handle, touch);
        await edgeDrag.move(viewport.y + viewport.height - 8);
        await expect.poll(() => region.evaluate((el) => el.scrollTop)).toBeGreaterThan(36);
        await edgeDrag.end(true);
        await expect(items.first()).toContainText('测试成员 1');
        await expect(editor.locator('[data-dragging]')).toHaveCount(0);
        await region.evaluate((el) => {
          el.scrollTop = 0;
        });
      }
      if (!mobile) {
        await handle.press('ArrowDown');
        await expect(items.nth(1)).toContainText('测试成员 1');
        await expect(handle).toBeFocused();
        await handle.press('ArrowUp');
        await expect(items.first()).toContainText('测试成员 1');
        await expect(handle).toHaveCSS('outline-style', 'solid');
      }
      await expect(toggle('测试成员 1')).toHaveAttribute('aria-expanded', 'false');
      await touch?.detach();
      await activate(toggle('测试成员 1'));
      await expect(
        editor.getByRole('button', { name: '上移测试成员 1', exact: true }),
      ).toBeDisabled();
      const name = editor.getByRole('textbox', { name: '显示名称', exact: true });
      const preview = editor.getByRole('textbox', { name: '摘要', exact: true });
      await name.fill('项目对接');
      await preview.fill('周五确认交付');
      const save = editor.getByRole('button', { name: '保存', exact: true });
      if (mobile) {
        const resizeVisualViewport = (height: number | null) =>
          page.evaluate((height) => {
            const viewport = window.visualViewport!;
            Object.defineProperties(viewport, {
              height: { configurable: true, value: height ?? innerHeight },
              offsetTop: { configurable: true, value: height === null ? 0 : 40 },
            });
            viewport.dispatchEvent(new Event('resize'));
          }, height);
        await resizeVisualViewport(430);
        await expect(editor).toHaveCSS('height', '406px');
        const box = (await save.boundingBox())!;
        expect(box.y + box.height).toBeLessThan(470);
        await expect(preview).toHaveValue('周五确认交付');
        await resizeVisualViewport(null);
        await expect(editor).toHaveCSS('height', '680px');
      }
      const track = region.locator('..').locator('[data-orientation="vertical"]');
      if (mobile) await expect(track).toHaveCSS('visibility', 'hidden');
      else {
        await region.hover();
        await expect(track).toHaveCSS('opacity', '1');
      }
      const layout = await items.first().evaluate((el) => {
        const viewport = el.closest('[data-radix-scroll-area-viewport]')!;
        return {
          gap: viewport.getBoundingClientRect().right - el.getBoundingClientRect().right,
          overflow: viewport.scrollWidth - viewport.clientWidth,
        };
      });
      expect(layout.gap).toBeGreaterThanOrEqual(mobile ? 20 : 24);
      expect(layout.overflow).toBeLessThanOrEqual(1);
      if (skin.id === 'wechat' && mode === 'light') {
        await editor.screenshot({ path: info.outputPath('list-edit.png') });
      }
      if (mobile) {
        await region.evaluate((el) => {
          el.scrollTop = 0;
        });
        const box = (await region.boundingBox())!;
        const point = { x: box.x + box.width - 10, y: box.y + box.height - 30 };
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
        for (let offset = 30; offset <= 180; offset += 30)
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: point.x, y: point.y - offset }],
          });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await cdp.detach();
      } else {
        await region.focus();
        await region.press('End');
      }
      await expect.poll(() => region.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      await activate(items.last().getByRole('button', { name: /^编辑/ }));
      await expect(preview).toBeVisible();
      await page.evaluate(() => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === 'fish-island:chat:list-appearance') {
            Storage.prototype.setItem = original;
            throw new Error('synthetic storage failure');
          }
          original.call(this, key, value);
        };
      });
      await activate(save);
      await expect(editor.getByRole('alert')).toContainText('本地保存失败');
      await activate(save);
      await expect(editor).toHaveCount(0);
      await expect(trigger).toBeFocused();
      const rows = list.getByRole('listitem');
      await expect(rows.first()).toContainText('项目对接');
      await expect(rows.first()).toContainText('周五确认交付');
      await expect(rows.nth(1)).toContainText('测试成员 0');
      await page.getByRole('searchbox', { name: '搜索聊天' }).fill('周五确认');
      await expect(rows).toHaveCount(1);
      if (popup) await activate(page.getByRole('button', { name: '关闭聊天列表' }));
      await expect(draft).toHaveText('保留消息草稿');
      expect(fixture.stats()).toMatchObject({
        connections: baseline.connections,
        historyRequests: baseline.historyRequests,
      });
      expect(requests).toBe(3);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await openList();
      await expect(rows.first()).toContainText('项目对接');
      await activate(trigger);
      await activate(editor.getByRole('button', { name: '恢复默认顺序' }));
      await activate(toggle('项目对接'));
      await name.fill('');
      await preview.fill('');
      await activate(save);
      await expect(rows.first()).toContainText('测试成员 0');
      await expect(rows.nth(1)).toContainText('测试成员 1');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
