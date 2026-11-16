import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    test(`${skin.id} ${mode}: device clocks cannot displace displayed messages`, async ({
      page,
    }) => {
      const chat = await setupChatMenu(page, skin.id, mode);
      const broadcast = (id: string, offset: number) =>
        chat.broadcast({
          id,
          content: `合成顺序 ${id}`,
          timestamp: 1794441600000 + offset,
          sender: { id: '456', name: '合成岛友' },
        });
      broadcast('uuid-z', 30000);
      await expect(page.locator('[data-message-id="uuid-z"]')).toBeVisible();
      broadcast('uuid-a', 0);
      await expect(page.locator('[data-message-id="uuid-a"]')).toBeVisible();
      broadcast('uuid-b', 30000);
      await expect(page.locator('[data-message-id="uuid-b"]')).toBeVisible();
      broadcast('uuid-c', -30000);
      await expect(page.locator('[data-message-id="uuid-c"]')).toBeVisible();
      await expect
        .poll(() =>
          page
            .locator('[data-message-id]')
            .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-message-id'))),
        )
        .toEqual(['uuid-z', 'uuid-a', 'uuid-b', 'uuid-c']);
      const positions = await page
        .locator('[data-message-id]')
        .evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().top));
      expect(positions.every((top, index) => !index || top > positions[index - 1]!)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(chat.stats()).toMatchObject({ connections: 1, historyRequests: 1 });
    });
