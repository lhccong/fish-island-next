import { expect, type Page } from '@playwright/test';

export async function openMessageActions(
  page: Page,
  id: string,
  position: 'start' | 'end' = 'end',
) {
  const scroll = page.getByRole('region', { name: '群聊消息区', exact: true });
  await scroll.evaluate((element, position) => {
    element.scrollTop = position === 'start' ? 0 : element.scrollHeight;
  }, position);
  const row = page.locator(`[data-message-id="${id}"]`);
  const bubble = row.getByRole('group');
  await expect(bubble).toBeVisible();
  await bubble.scrollIntoViewIfNeeded();
  if (page.viewportSize()!.width <= 760) {
    const touch = await page.context().newCDPSession(page);
    const box = (await bubble.boundingBox())!;
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + Math.min(20, box.height / 2) }],
    });
    await expect(page.getByRole('menu')).toBeVisible();
    await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await touch.detach();
  } else await bubble.click({ button: 'right' });
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  return menu;
}
