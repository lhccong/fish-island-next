import { expect, test } from '@playwright/test';
import { setupChatMenu } from './chat-menu-fixture';

test('viewer wheel or two-finger zoom preserves the page and closes', async ({ page }) => {
  await setupChatMenu(page, 'wechat', 'dark').then((fixture) => {
    fixture.push('8001', '[img]https://menu.test/image.png[/img]');
  });
  const trigger = page.getByRole('button', { name: '放大聊天图片' });
  await expect(trigger).toBeEnabled();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '图片预览' });
  const stage = dialog.getByRole('region', { name: '图片画布' });
  await expect(stage).toHaveAttribute('data-preview-state', 'ready');
  const ratio = dialog.getByRole('button', { name: '原始比例', exact: true });
  const before = await ratio.textContent();
  if (page.viewportSize()!.width <= 760) {
    const session = await page.context().newCDPSession(page);
    const box = (await stage.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: x - 30, y },
        { x: x + 30, y },
      ],
    });
    for (let step = 1; step <= 6; step++) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: x - 30 - step * 5, y },
          { x: x + 30 + step * 5, y },
        ],
      });
      await page.evaluate(
        () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
      );
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await stage.hover();
    await page.mouse.wheel(0, -200);
  }
  await expect(ratio).not.toHaveText(before!);
  await dialog.getByRole('button', { name: '适应窗口' }).click();
  await expect(ratio).toHaveText(before!);
  await stage.focus();
  await page.keyboard.press('+');
  await expect(ratio).not.toHaveText(before!);
  await page.keyboard.press('0');
  await expect(ratio).toHaveText(before!);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
