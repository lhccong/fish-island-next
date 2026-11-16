import { expect, test, type WebSocketRoute } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupAdmin } from './admin-fixture';

test('all themes: readable golden broadcasts, slow full playback and reduced motion', async ({
  page,
  isMobile,
}, info) => {
  test.setTimeout(180000);
  await setupAdmin(page);
  let socket: WebSocketRoute | undefined;
  let connections = 0;
  await page.routeWebSocket(/\/ws\//, (ws) => {
    socket = ws;
    connections++;
  });
  await page.goto('/discover');
  await expect.poll(() => Boolean(socket)).toBe(true);
  await page.clock.install({ time: new Date('2026-11-16T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-16T12:00:01Z'));
  const initialConnections = connections;
  const banner = page.getByRole('complementary', { name: '全体播报' });
  const card = banner.locator(':scope > div');
  const text = banner.locator('[data-broadcast-content]');
  const send = (id: string, content: string) =>
    socket!.send(
      JSON.stringify({
        type: 'broadcast',
        data: { id, content, publishedAt: 1794800000000 },
      }),
    );
  for (const width of isMobile ? [375, 390] : [1280]) {
    await page.setViewportSize({ width, height: isMobile ? 844 : 720 });
    for (const skin of builtinSkins)
      for (const mode of ['light', 'dark'] as const) {
        const prefix = `${width}-${skin.id}-${mode}`;
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.evaluate(
          async ({ skin, mode }) => {
            const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
            useAppearanceStore.getState().setSkinId(skin);
            useAppearanceStore.getState().setColorMode(mode);
          },
          { skin: skin.id, mode },
        );
        await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
        await expect(banner).toHaveCount(0);
        send(`${prefix}-short`, '全岛福利已开启');
        await expect(card).toHaveAttribute('data-duration-ms', '3000');
        await expect(card).toHaveAttribute('data-distance', '0');
        expect(await text.evaluate((el) => el.getAnimations().length)).toBe(0);
        await expect(card).toHaveCSS('opacity', '1');
        const shortBounds = (await card.boundingBox())!;
        expect(shortBounds.width).toBeLessThan(300);
        expect(Math.abs(shortBounds.x + shortBounds.width / 2 - width / 2)).toBeLessThan(1);
        expect(
          await text.evaluate((el) => el.parentElement!.clientWidth - el.scrollWidth),
        ).toBeLessThanOrEqual(1);
        await page.screenshot({ path: info.outputPath(`${prefix}-short.png`) });
        await page.clock.fastForward(2999);
        await expect(banner).toBeVisible();
        await page.clock.fastForward(1);
        await expect(banner).toHaveCount(0);
        const content =
          '🎉 恭喜岛友抽中奖励！活动结束后未使用的奖券将过期，请及时前往活动页面领取。'.repeat(3);
        send(`${prefix}-long`, content);
        send(`${prefix}-long`, content);
        send(`${prefix}-next`, '下一条播报');
        await expect(banner.getByRole('status')).toHaveText(`全体播报：${content}`);
        const duration = Number(await card.getAttribute('data-duration-ms'));
        const distance = Number(await card.getAttribute('data-distance'));
        expect(duration).toBeGreaterThan(3000);
        expect(distance).toBeGreaterThan(40);
        expect(duration).toBe(2400 + Math.ceil((distance / 40) * 1000));
        const movement = await text.evaluate((el) => {
          const a = el.getAnimations()[0]!;
          a.pause();
          a.currentTime = 2200;
          return new DOMMatrixReadOnly(getComputedStyle(el).transform).m41;
        });
        expect(movement).toBeCloseTo(-40, 0);
        await expect(card).toHaveCSS('opacity', '1');
        const bounds = (await card.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(12);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
        expect(bounds.height).toBeLessThanOrEqual(48);
        await expect(card).toHaveCSS('box-shadow', 'none');
        const close = banner.getByRole('button', { name: '关闭播报' });
        await expect(close).toHaveCSS('height', '44px');
        await expect(close.locator('svg')).toHaveAttribute('width', '14');
        if (!isMobile) {
          await close.hover();
          await expect(close).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        }
        await close.focus();
        await page.screenshot({ path: info.outputPath(`${prefix}.png`) });
        await page.clock.fastForward(3000);
        await expect(banner.getByRole('status')).toHaveText(`全体播报：${content}`);
        await text.evaluate((el) => {
          const a = el.getAnimations()[0]!;
          a.currentTime = Number(a.effect!.getTiming().duration) - 1200;
          const lane = el.parentElement!;
          if (el.getBoundingClientRect().right > lane.getBoundingClientRect().right + 1)
            throw new Error('末尾未完整展示');
        });
        await page.clock.fastForward(duration - 3000 - 1);
        await expect(banner.getByRole('status')).toHaveText(`全体播报：${content}`);
        await page.clock.fastForward(1);
        await expect(banner.getByRole('status')).toHaveText('全体播报：下一条播报');
        if (isMobile) await close.tap();
        else await close.click();
        await expect(banner).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.emulateMedia({ reducedMotion: 'reduce' });
        send(`${prefix}-reduced`, content);
        await expect(text).toHaveCSS('white-space', 'normal');
        expect(await text.evaluate((el) => el.getAnimations().length)).toBe(0);
        const readingDuration = Number(await card.getAttribute('data-duration-ms'));
        expect(readingDuration).toBeGreaterThan(3000);
        expect((await card.boundingBox())!.height).toBeLessThan(page.viewportSize()!.height);
        await page.screenshot({ path: info.outputPath(`${prefix}-reduced.png`) });
        await page.clock.fastForward(readingDuration - 1);
        await expect(banner).toBeVisible();
        await page.clock.fastForward(1);
        await expect(banner).toHaveCount(0);
        expect(connections).toBe(initialConnections);
      }
  }
  await page.clock.resume();
  await page.goto('about:blank');
});
