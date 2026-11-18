import { expect, test, type Route } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { openMessageActions } from './chat-message-actions';

test('avatar gestures retain pending poke and quote across appearance changes', async ({
  page,
}) => {
  const fixture = await setupChatMenu(page, 'wechat', 'light');
  const mobile = page.viewportSize()!.width <= 760;
  const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
  fixture.push('1', '引用原文');
  const menu = await openMessageActions(page, '1');
  await menu.getByRole('menuitem', { name: '引用', exact: true }).click();
  const quote = page.getByRole('region', { name: '引用消息', exact: true });
  await expect(quote).toContainText('引用原文');
  await draft.fill('手势保留草稿');
  const sends: Record<string, string>[] = [];
  let held!: Route;
  await page.route('**/api/chat/message/send', (route) => {
    sends.push(route.request().postDataJSON() as Record<string, string>);
    held = route;
  });
  const avatar = page.locator('[data-message-id="1"] [data-message-avatar]');
  if (mobile) {
    await avatar.tap();
    await avatar.tap();
    await avatar.tap();
  } else await avatar.click({ clickCount: 3, delay: 60 });
  await expect.poll(() => sends.length).toBe(1);
  await page.waitForTimeout(400);
  await expect(draft).toHaveText('手势保留草稿');
  expect(sends[0]!.quotedMessageId).toBeUndefined();
  for (const skin of builtinSkins)
    for (const mode of ['light', 'dark']) {
      await page.evaluate(
        async ({ skin, mode }) => {
          const path = '/src/features/appearance/index.ts';
          const { useAppearanceStore } = (await import(
            path
          )) as typeof import('../../src/features/appearance');
          useAppearanceStore.getState().setSkinId(skin);
          useAppearanceStore.getState().setColorMode(mode);
        },
        { skin: skin.id, mode },
      );
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
      await expect(page.locator('[data-message-id^="local:"]').getByRole('status')).toHaveText(
        '发送中…',
      );
      await expect(draft).toHaveText('手势保留草稿');
      await expect(quote).toContainText('引用原文');
      expect(sends).toHaveLength(1);
      expect(fixture.stats()).toMatchObject({ connections: 1, historyRequests: 1 });
    }
  await held.fulfill({
    json: {
      code: 0,
      data: {
        message: {
          id: '100',
          sender: { id: '123', name: '本人合成' },
          content: '兼容提示',
          timestamp: Date.now(),
          clientMessageId: sends[0]!.clientMessageId,
          poke: { targetId: '456', targetName: '合成岛友', suffix: '' },
        },
      },
    },
  });
  await expect(page.locator('[data-message-id="100"]')).toContainText('我拍了拍「合成岛友」');
  for (let i = 101; i <= 125; i++) fixture.push(String(i), `滑动测试 ${i}\n第二行\n第三行`);
  const lastAvatar = page.locator('[data-message-id="125"] [data-message-avatar]');
  await expect(lastAvatar).toBeVisible();
  const viewport = page.getByRole('region', { name: '群聊消息区', exact: true });
  const before = await viewport.evaluate((el) => el.scrollTop);
  if (mobile) {
    await lastAvatar.tap();
    const box = (await lastAvatar.boundingBox())!;
    const touch = await page.context().newCDPSession(page);
    try {
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let step = 1; step <= 8; step++) {
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y: y + step * 10 }],
        });
        await page.evaluate(() => new Promise(requestAnimationFrame));
      }
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } finally {
      await touch.detach();
    }
  } else {
    await lastAvatar.hover();
    await page.mouse.wheel(0, -200);
  }
  await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBeLessThan(before - 1);
  await page.waitForTimeout(400);
  await expect(draft).toHaveText('手势保留草稿');
  await expect(quote).toContainText('引用原文');
  expect(sends).toHaveLength(1);
  expect(await viewport.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});
