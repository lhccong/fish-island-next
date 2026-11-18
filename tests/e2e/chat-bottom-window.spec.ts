import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { scrollChatUp } from './chat-scroll-actions';

test.setTimeout(90000);

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    test(`${skin.id} ${mode}: following survives the bounded message window advancing`, async ({
      page,
    }) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      try {
        const viewport = page.getByRole('region', { name: '群聊消息区', exact: true });
        for (let id = 1; id <= 1000; id++) fixture.push(String(id), `有界消息窗口 ${id}`);
        await expect(page.locator('[data-message-id="1000"]')).toBeInViewport();
        for (let id = 1001; id <= 1003; id++) {
          fixture.push(
            String(id),
            id === 1001
              ? `窗口更新 ${id}`
              : `窗口更新 ${id}\n${'完整显示末条消息。'.repeat(id - 999)}`,
          );
          await expect(page.locator(`[data-message-id="${id}"]`)).toBeInViewport();
          await expect
            .poll(() => viewport.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop))
            .toBeLessThanOrEqual(1);
        }
        await scrollChatUp(page, viewport);
        const anchor = page.locator('[data-message-id="1002"]');
        const before = (await anchor.boundingBox())!.y;
        fixture.push('1004', '窗口淘汰旧消息时仍保留阅读锚点');
        await expect(page.getByLabel('1 条新消息', { exact: true })).toBeVisible();
        await expect
          .poll(async () => Math.abs((await anchor.boundingBox())!.y - before))
          .toBeLessThanOrEqual(1);
        await page.getByRole('button', { name: '查看最新消息', exact: true }).click();
        await expect
          .poll(() => viewport.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop))
          .toBeLessThanOrEqual(1);
        expect(await page.locator('[data-message-id]').count()).toBeLessThan(80);
        expect(fixture.stats()).toMatchObject({ connections: 1, historyRequests: 1 });
      } finally {
        fixture.dispose();
      }
    });
