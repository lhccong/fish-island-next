import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { openMessageActions } from './chat-message-actions';

test.use({ serviceWorkers: 'block' });
test.setTimeout(60000);

function readBubbleStyle(bubble: Locator) {
  return bubble.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      background: style.background,
      border: style.border,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      color: style.color,
      padding: style.padding,
    };
  });
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: keep default bubbles when hiding decorations`, async ({
      page,
    }, info) => {
      const artworkUrl = 'https://bubble.test/frame.svg';
      let artworkRequests = 0;
      await page.route(artworkUrl, (route) => {
        artworkRequests++;
        return route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect width="200" height="120" fill="#513577"/></svg>',
        });
      });
      let memberRequest = 0;
      let finishLoading!: () => void;
      const loading = new Promise<void>((resolve) => {
        finishLoading = resolve;
      });
      const fixture = await setupChatMenu(page, skin.id, mode, 'user', async () => {
        await page.route('**/api/chat/online/user', async (route) => {
          const request = ++memberRequest;
          if (request === 1) {
            await loading;
            await route.fulfill({ status: 500 });
          } else {
            await route.fulfill({
              json: {
                code: 0,
                data:
                  request === 2
                    ? []
                    : Array.from({ length: 18 }, (_, index) => ({
                        id: index + 1,
                        name: `合成成员 ${index + 1}`,
                      })),
              },
            });
          }
        });
      });

      const mobile = page.viewportSize()!.width <= 760;
      const activate = (target: Locator) => (mobile ? target.tap() : target.click());
      const details = page.getByRole('button', { name: '群聊详情', exact: true });
      const panel = page.getByRole('complementary', { name: '在线成员', exact: true });
      const toggle = panel.getByRole('switch', { name: '隐藏气泡装扮', exact: true });
      const change = async () => {
        if (mobile) await toggle.tap();
        else {
          await page.keyboard.press('Tab');
          await toggle.focus();
          await expect(toggle).toHaveCSS('outline-style', 'solid');
          await page.keyboard.press('Space');
        }
      };
      const close = async () => {
        if (mobile) await panel.getByRole('button', { name: '关闭在线列表' }).tap();
        else await page.keyboard.press('Escape');
        await expect(details).toBeFocused();
      };
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('气泡偏好合成草稿');
      const content = (id: string) => page.locator(`[data-message-id="${id}"]`).getByRole('group');
      const own = content('100');
      const ordinary = content('101');
      const decorated = content('102');
      fixture.push('100', '本人普通消息', true);
      fixture.push('101', '普通消息');
      fixture.broadcast({
        id: '102',
        content: '内置装扮消息',
        bubbleId: 'berry-cat-paw',
        sender: { id: '123', name: '本人合成' },
        timestamp: 1794441600102,
      });
      await expect(decorated).toHaveCSS('border-image-source', /^url\(/);
      const incoming = await readBubbleStyle(ordinary);
      const outgoing = await readBubbleStyle(own);

      await activate(details);
      await expect(panel.getByText('正在获取在线成员…')).toBeVisible();
      await expect(toggle).not.toBeChecked();
      finishLoading();
      await expect(panel.getByRole('alert')).toContainText('在线成员加载失败');
      await activate(panel.getByRole('button', { name: '重试', exact: true }));
      await expect(panel.getByText('暂无在线成员，可稍后刷新查看。')).toBeVisible();
      await activate(panel.getByRole('button', { name: '刷新', exact: true }));
      await expect(panel.getByRole('heading', { name: '在线成员（18）' })).toBeVisible();
      const viewport = page.viewportSize()!;
      await page.setViewportSize({ ...viewport, height: 580 });
      const scroll = panel.getByRole('region', { name: '在线成员滚动区' });
      const thumb = panel.locator('[data-orientation="vertical"]').first();
      await expect
        .poll(() => scroll.evaluate((element) => element.scrollHeight - element.clientHeight))
        .toBeGreaterThan(0);
      if (mobile) {
        const frame = (await scroll.boundingBox())!;
        const cdp = await page.context().newCDPSession(page);
        const x = frame.x + frame.width / 2;
        const y = frame.y + frame.height - 40;
        try {
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y }],
          });
          for (let step = 1; step <= 8; step++) {
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x, y: y - step * 20 }],
            });
            await page.evaluate(() => new Promise(requestAnimationFrame));
          }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        } finally {
          await cdp.detach();
        }
        await expect(thumb).toBeHidden();
      } else {
        await scroll.hover();
        await page.mouse.wheel(0, 180);
        await expect(thumb).toBeVisible();
        await expect(thumb).toHaveCSS('opacity', '1');
      }
      await expect.poll(() => scroll.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      await expect
        .poll(() =>
          scroll.evaluate(async (element) => {
            const start = element.scrollTop;
            for (let frame = 0; frame < 8; frame++) await new Promise(requestAnimationFrame);
            return element.scrollTop - start;
          }),
        )
        .toBe(0);
      await toggle.scrollIntoViewIfNeeded();
      expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const clearance = await toggle.evaluate((element) => {
        const viewport = element.closest('[data-radix-scroll-area-viewport]')!;
        return viewport.getBoundingClientRect().right - element.getBoundingClientRect().right;
      });
      expect(clearance).toBeGreaterThanOrEqual(mobile ? 20 : 24);
      await change();
      await expect(toggle).toBeChecked();
      await expect(panel.getByRole('switch', { name: '默认不渲染图片' })).not.toBeChecked();
      if (['moyu-island', 'pixel-island', 'wps'].includes(skin.id))
        await page.screenshot({ path: info.outputPath('settings.png') });
      await close();
      await page.setViewportSize(viewport);

      fixture.broadcast({
        id: '103',
        content: '远程装扮消息',
        bubbleId: 'test-frame',
        bubbleArtwork: { imageUrl: artworkUrl, textTone: 'light' },
        sender: { id: '456', name: '合成岛友' },
        timestamp: 1794441600103,
      });
      const remote = content('103');
      for (const message of [decorated, remote]) {
        await expect(message).toHaveCSS('border-image-source', 'none');
      }
      expect(await readBubbleStyle(ordinary)).toEqual(incoming);
      expect(await readBubbleStyle(own)).toEqual(outgoing);
      expect(await readBubbleStyle(decorated)).toEqual(outgoing);
      expect(await readBubbleStyle(remote)).toEqual(incoming);
      await expect(remote).toHaveText('远程装扮消息');
      await expect(remote).not.toHaveAttribute('data-custom-bubble');
      expect(artworkRequests).toBe(0);
      const overflow = await page
        .locator('[data-message-id], [aria-label="群聊消息区"]')
        .evaluateAll((elements) =>
          elements.some((element) => element.scrollWidth > element.clientWidth + 1),
        );
      expect(overflow).toBe(false);
      if (['moyu-island', 'pixel-island', 'wps'].includes(skin.id))
        await page.screenshot({ path: info.outputPath('default-bubbles.png') });
      const menu = await openMessageActions(page, '103');
      await activate(menu.getByRole('menuitem', { name: '复制', exact: true }));
      await expect.poll(fixture.clipboardText).toBe('远程装扮消息');
      fixture.push('104', '[img]https://menu.test/image.png[/img]');
      await expect(
        content('104').getByRole('img', { name: '聊天图片', exact: true }),
      ).toBeVisible();
      fixture.revoke('104');
      await expect(content('104')).toHaveText('消息已撤回');

      await activate(details);
      await change();
      await close();
      await page.getByRole('region', { name: '群聊消息区', exact: true }).evaluate((element) => {
        element.scrollTop = 0;
      });
      await expect(decorated).toHaveCSS('border-image-source', /^url\(/);
      expect(await readBubbleStyle(ordinary)).toEqual(incoming);
      await expect.poll(() => artworkRequests).toBeGreaterThan(0);
      await expect(draft).toHaveText('气泡偏好合成草稿');
      expect(fixture.stats().connections).toBe(1);
      expect(fixture.stats().historyRequests).toBe(1);
      await activate(details);
      await change();
      await close();
      if (mobile) await page.setViewportSize({ width: 1280, height: 720 });
      await page.getByRole('button', { name: '切换主题', exact: true }).click();
      const picker = page.getByRole('dialog', { name: '主题模式' });
      await picker
        .getByRole('button', { name: mode === 'light' ? '暗夜模式' : '明亮模式', exact: true })
        .click();
      await picker
        .getByRole('button', {
          name: builtinSkins.find((item) => item.id !== skin.id)!.name,
          exact: true,
        })
        .click();
      await picker.getByRole('button', { name: '关闭主题弹窗' }).click();
      await page.setViewportSize(viewport);
      await expect(decorated).toHaveCSS('border-image-source', 'none');
      await expect(draft).toHaveText('气泡偏好合成草稿');
      expect(fixture.stats().connections).toBe(1);
      expect(fixture.stats().historyRequests).toBe(1);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await activate(details);
      await expect(toggle).toBeChecked();
      await page.evaluate(() => {
        Storage.prototype.setItem = () => {
          throw new Error('synthetic storage denied');
        };
      });
      await change();
      await expect(toggle).not.toBeChecked();
      await expect(
        panel.getByRole('status').getByText('气泡偏好未能保存，当前页面已生效'),
      ).toBeVisible();

      await page.goto('/chat/mini', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('dialog', { name: /\.xlsx — Excel$/ })).toBeVisible();
      await expect(page.getByRole('status', { name: '聊天室连接状态' })).toHaveText(
        '已连接 · HTTP 发送 / 实时接收',
      );
      fixture.broadcast({
        id: '105',
        content: '小窗装扮消息',
        bubbleId: 'berry-cat-paw',
        sender: { id: '456', name: '合成岛友' },
        timestamp: 1794441600105,
      });
      await expect(content('105')).toBeVisible();
      await expect(content('105')).toHaveCSS('border-image-source', 'none');
    });
  }
