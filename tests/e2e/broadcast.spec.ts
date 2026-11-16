import { expect, test, type WebSocketRoute } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupAdmin } from './admin-fixture';

const frame = (id: string, content: string) =>
  JSON.stringify({
    type: 'broadcast',
    data: { id, content, publishedAt: 1794800000000 },
  });
test.setTimeout(60000);

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: publish states and global queued broadcast`, async ({
      page,
      isMobile,
    }, info) => {
      await setupAdmin(page, skin.id, mode);
      let socket: WebSocketRoute | undefined;
      let connections = 0;
      await page.routeWebSocket(/\/ws\//, (ws) => {
        socket = ws;
        connections++;
      });
      let calls = 0;
      let fail = true;
      let release: () => void = () => {};
      await page.route('**/api/admin/broadcast/publish', async (route) => {
        calls++;
        expect(route.request().headers()['test-session']).toBe('synthetic-value');
        expect(route.request().postDataJSON()).toEqual({
          content: '<b>合成全体播报</b> 请留意岛上消息',
        });
        if (fail) {
          await new Promise<void>((resolve) => {
            release = resolve;
          });
          await route.fulfill({ json: { code: 40000, message: '合成发布失败，请重试' } });
        } else await route.fulfill({ json: { code: 0, data: true } });
      });
      await page.goto('/admin');
      await page
        .getByRole('navigation', { name: '管理导航' })
        .filter({ visible: true })
        .getByRole('link', { name: '全体播报', exact: true })
        .click();
      await expect(page).toHaveURL('/admin/broadcast');
      const text = page.getByRole('textbox', { name: '播报内容' });
      const publish = page.getByRole('button', { name: '发布播报', exact: true });
      await expect(publish).toBeDisabled();
      await expect(page.getByRole('complementary', { name: '全体播报' })).toHaveCount(0);
      await text.fill('  ');
      await expect(publish).toBeDisabled();
      await text.fill(' <b>合成全体播报</b> 请留意岛上消息 ');
      await page.evaluate(
        async ({ skin, mode }) => {
          const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
          const store = useAppearanceStore.getState();
          store.setSkinId('wps');
          store.setColorMode(mode === 'dark' ? 'light' : 'dark');
          store.setSkinId(skin);
          store.setColorMode(mode);
        },
        { skin: skin.id, mode },
      );
      await expect(text).toHaveValue(' <b>合成全体播报</b> 请留意岛上消息 ');
      expect(calls).toBe(0);
      if (isMobile) await publish.tap();
      else await publish.click();
      await expect(page.getByRole('status').filter({ hasText: '发布中' })).toBeVisible();
      await expect(text).toBeDisabled();
      await expect(page.getByRole('button', { name: /发布中/ })).toBeDisabled();
      await page.screenshot({ path: info.outputPath('pending.png') });
      release();
      await expect(page.getByRole('alert')).toContainText('合成发布失败');
      await expect(text).toHaveValue(' <b>合成全体播报</b> 请留意岛上消息 ');
      await page.screenshot({ path: info.outputPath('error.png') });
      fail = false;
      if (isMobile) await publish.tap();
      else await publish.click();
      await expect(text).toHaveValue('');
      await expect(page.getByRole('status').filter({ hasText: '播报已提交' })).toBeVisible();
      expect(calls).toBe(2);
      await expect.poll(() => Boolean(socket)).toBe(true);
      await page.clock.install({ time: new Date('2026-11-16T12:00:00Z') });
      await page.clock.pauseAt(new Date('2026-11-16T12:00:01Z'));
      socket!.send(frame('synthetic-1', '<b>合成全体播报</b> 请留意岛上消息'));
      socket!.send(frame('synthetic-1', '<b>合成全体播报</b> 请留意岛上消息'));
      socket!.send(frame('synthetic-2', '第二条合成播报：' + '测试长文字'.repeat(35)));
      const banner = page.getByRole('complementary', { name: '全体播报' });
      await expect(banner).toHaveCount(1);
      await expect(banner.getByRole('status')).toHaveText(
        '全体播报：<b>合成全体播报</b> 请留意岛上消息',
      );
      expect(await banner.locator('b').count()).toBe(0);
      const before = await banner.locator(':scope > div').boundingBox();
      expect(before!.x).toBeGreaterThanOrEqual(12);
      expect(before!.x + before!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      const close = banner.getByRole('button', { name: '关闭播报' });
      const closeBounds = (await close.boundingBox())!;
      await expect(close).toHaveCSS('height', '44px');
      expect(Math.abs(closeBounds.y - before!.y)).toBeLessThanOrEqual(2);
      expect(
        Math.abs(closeBounds.x + closeBounds.width - before!.x - before!.width),
      ).toBeLessThanOrEqual(2);
      await expect(close.locator('svg')).toHaveAttribute('width', '14');
      await close.focus();
      const moving = banner.locator('[aria-hidden="true"]').filter({ hasText: '合成全体播报' });
      await expect(moving).toHaveCSS('white-space', 'nowrap');
      await page.screenshot({ path: info.outputPath('broadcast.png') });
      if (isMobile) await close.tap();
      else await close.click();
      await expect(banner.getByRole('status')).toContainText('第二条合成播报');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const connectionsBeforeSwitch = connections;
      await page.clock.fastForward(2000);
      await page.evaluate(async () => {
        const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
        useAppearanceStore
          .getState()
          .setColorMode(useAppearanceStore.getState().colorMode === 'dark' ? 'light' : 'dark');
        useAppearanceStore.getState().setSkinId('wps');
      });
      await expect(banner.getByRole('status')).toContainText('第二条合成播报');
      expect(connections).toBe(connectionsBeforeSwitch);
      expect(calls).toBe(2);
      await page.evaluate(async () => {
        const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
        useAppearanceStore.getState().setColorMode('dark');
      });
      await page.clock.fastForward(999);
      await expect(banner.getByRole('status')).toContainText('第二条合成播报');
      await page.clock.fastForward(1);
      await expect(banner.getByRole('status')).toContainText('第二条合成播报');
      const longDuration = Number(
        await banner.locator(':scope > div').getAttribute('data-duration-ms'),
      );
      expect(longDuration).toBeGreaterThan(3000);
      await page.clock.fastForward(longDuration - 3000);
      await expect(banner).toHaveCount(0);
      // 客户端导航到其他菜单，验证全局订阅与连接不依赖管理页面。
      await page.evaluate(() => {
        history.pushState({}, '', '/discover');
        dispatchEvent(new PopStateEvent('popstate'));
      });
      await expect(page).toHaveURL('/discover');
      socket!.send(frame('synthetic-3', '跨页面合成播报'));
      await expect(banner.getByRole('status')).toContainText('跨页面合成播报');
      await page.clock.fastForward(2999);
      await expect(banner.getByRole('status')).toContainText('跨页面合成播报');
      await page.clock.fastForward(1);
      await expect(banner).toHaveCount(0);
      socket!.send(frame('synthetic-3', '跨页面合成播报'));
      await expect(banner).toHaveCount(0);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(
        async ({ skin, mode }) => {
          const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
          useAppearanceStore.getState().setSkinId(skin);
          useAppearanceStore.getState().setColorMode(mode);
        },
        { skin: skin.id, mode },
      );
      socket!.send(frame('synthetic-4', '减少动态效果\n'.repeat(25)));
      await expect(banner.getByRole('status')).toContainText('减少动态效果');
      await expect(banner.locator('span[aria-hidden="true"]')).toHaveCSS('animation-name', 'none');
      expect((await banner.boundingBox())!.height).toBeLessThan(page.viewportSize()!.height);
      await page.screenshot({ path: info.outputPath('reduced-motion.png') });
      const readingDuration = Number(
        await banner.locator(':scope > div').getAttribute('data-duration-ms'),
      );
      expect(readingDuration).toBeGreaterThan(3000);
      await page.clock.fastForward(readingDuration - 1);
      await expect(banner.getByRole('status')).toContainText('减少动态效果');
      await page.clock.fastForward(1);
      await expect(banner).toHaveCount(0);
      expect(connections).toBe(connectionsBeforeSwitch);
      await page.clock.resume();
      await page.goto('about:blank');
    });
  }

test('ordinary users cannot open publisher but receive global broadcasts', async ({ page }) => {
  await setupAdmin(page, 'wechat', 'light', 'user');
  let socket: WebSocketRoute | undefined;
  await page.routeWebSocket(/\/ws\//, (ws) => {
    socket = ws;
  });
  await page.goto('/admin/broadcast');
  await expect(page.getByRole('alert')).toContainText('仅管理员可以访问此页面');
  await expect(page.getByRole('textbox', { name: '播报内容' })).toHaveCount(0);
  await expect.poll(() => Boolean(socket)).toBe(true);
  socket!.send(frame('synthetic-user', '普通用户接收合成播报'));
  const banner = page.getByRole('complementary', { name: '全体播报' });
  await expect(banner.getByRole('status')).toHaveText('全体播报：普通用户接收合成播报');
  await banner.getByRole('button', { name: '关闭播报' }).click();
  await page.goto('about:blank');
});
