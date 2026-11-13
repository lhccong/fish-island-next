import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(60000);

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: locate after accumulated messages and window eviction`, async ({
      page,
    }) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('恢复后保留草稿');
      for (let i = 1; i <= 100; i++) fixture.push(String(i), `初始消息 ${i}`);
      await expect(page.locator('[data-message-id="100"]')).toBeVisible();
      for (let i = 101; i <= 1100; i++)
        fixture.push(
          String(i),
          `${i === 900 ? '@本人合成 ' : ''}积累消息 ${i}${i % 3 === 0 ? '\n较高的消息\n继续正文' : ''}`,
        );
      fixture.broadcast({
        id: '1101',
        content: '恢复后的引用',
        timestamp: 1794441601101,
        sender: { id: '456', name: '合成岛友' },
        quotedMessage: {
          id: '900',
          content: '积累消息 900',
          sender: { id: '456', name: '合成岛友' },
        },
      });
      const notice = page.getByRole('button', { name: '有 1 条消息 @我，点击查看', exact: true });
      await expect(notice).toBeVisible();
      if (page.viewportSize()!.width <= 760) await notice.tap();
      else await notice.click();
      const target = page.locator('[data-message-id="900"]');
      await expect(target).toBeVisible();
      const scroll = page.getByRole('region', { name: '群聊消息区', exact: true });
      const inViewport = () =>
        target.evaluate((element) => {
          const viewport = element.closest('[data-radix-scroll-area-viewport]')!;
          const row = element.getBoundingClientRect();
          const bounds = viewport.getBoundingClientRect();
          return row.top < bounds.bottom && row.bottom > bounds.top;
        });
      await expect.poll(inViewport).toBe(true);
      await expect(page.getByText('已定位消息', { exact: true })).toBeVisible();
      // Allow virtual measurements and success feedback removal to settle, then sample every frame.
      await expect(page.getByText('已定位消息', { exact: true })).toHaveCount(0);
      const positions = await scroll.evaluate(async (element) => {
        const positions: number[] = [];
        for (let i = 0; i < 60; i++) {
          await new Promise(requestAnimationFrame);
          positions.push(element.scrollTop);
        }
        return positions;
      });
      expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(2);
      await expect.poll(inViewport).toBe(true);
      fixture.push('1102', '@本人合成 定位后到达的新消息');
      await expect(notice).toBeVisible();
      await expect.poll(inViewport).toBe(true);
      await expect.poll(() => draft.textContent()).toBe('恢复后保留草稿');
      expect(await scroll.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      expect(fixture.stats()).toMatchObject({ connections: 1, historyRequests: 1 });
      await page.getByRole('button', { name: '查看最新消息', exact: true }).click();
      await expect(page.locator('[data-message-id="1102"]')).toBeVisible();
      const quote = page.getByRole('button', { name: '定位原文：合成岛友', exact: true });
      if (page.viewportSize()!.width <= 760) await quote.tap();
      else await quote.click();
      await expect.poll(inViewport).toBe(true);
    });
  }
