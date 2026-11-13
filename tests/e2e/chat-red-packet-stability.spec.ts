import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    test(`${skin.id} ${mode}: mixed packet history stays still after scrolling`, async ({
      page,
    }) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const calls = new Map<string, number>();
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('**/api/redpacket/**', async (route) => {
        const id = new URL(route.request().url()).searchParams.get('redPacketId')!;
        calls.set(id, (calls.get(id) ?? 0) + 1);
        if (id === 'rpc_60') await pending;
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.fulfill({
          json: { code: 0, data: { name: '合成红包', type: 1, status: 0, remainingCount: 2 } },
        });
      });
      for (let index = 1; index <= 60; index++)
        fixture.push(
          String(index),
          index % 3 === 0
            ? `[redpacket]rpc_${index}[/redpacket]`
            : `[img]https://menu.test/image.png[/img] ${index}`,
        );
      const scroll = page.getByRole('region', { name: '群聊消息区', exact: true });
      await expect(page.locator('[data-message-id="60"]')).toBeVisible();
      const card = page.locator('[data-message-id="60"] [data-red-packet]');
      await expect(card.getByText('红包加载中…')).toBeVisible();
      const loadingHeight = (await card.boundingBox())!.height;
      await scroll.evaluate((element) => {
        element.scrollTop = 0;
      });
      await expect(card).toHaveCount(0);
      const latest = page.getByRole('button', { name: '查看最新消息', exact: true });
      if (page.viewportSize()!.width <= 760) await latest.tap();
      else await latest.click();
      await expect(card.getByText('红包加载中…')).toBeVisible();
      expect(calls.get('rpc_60')).toBe(1);
      release();
      await expect(card).toContainText('剩余 2 个');
      expect((await card.boundingBox())!.height).toBe(loadingHeight);
      await page.waitForTimeout(1500);
      // Move back through mixed variable-height rows, then release the scroll gesture.
      await scroll.evaluate((element) => {
        element.scrollTop -= 650;
      });
      await page.waitForTimeout(1800);
      const positions = await scroll.evaluate(async (element) => {
        const positions: number[] = [];
        for (let frame = 0; frame < 90; frame++) {
          await new Promise(requestAnimationFrame);
          positions.push(element.scrollTop);
        }
        return positions;
      });
      expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(1);
      expect(Math.max(...calls.values())).toBe(1);
      expect(await scroll.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
    });
