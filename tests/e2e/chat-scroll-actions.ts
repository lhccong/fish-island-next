import { expect, type Locator, type Page } from '@playwright/test';

export async function scrollChatUp(page: Page, viewport: Locator) {
  const before = await viewport.evaluate((element) => element.scrollTop);
  if (page.viewportSize()!.width <= 760) {
    const box = (await viewport.boundingBox())!;
    const touch = await page.context().newCDPSession(page);
    try {
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 3;
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let step = 1; step <= 8; step++) {
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y: y + step * 6 }],
        });
        await page.evaluate(() => new Promise(requestAnimationFrame));
      }
      await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    } finally {
      await touch.detach();
    }
  } else {
    await viewport.hover();
    await page.mouse.wheel(0, -48);
  }
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollTop))
    .toBeLessThan(before - 1);
  await expect
    .poll(() =>
      viewport.evaluate(async (element) => {
        const positions: number[] = [];
        for (let frame = 0; frame < 12; frame++) {
          await new Promise(requestAnimationFrame);
          positions.push(element.scrollTop);
        }
        return Math.max(...positions) - Math.min(...positions);
      }),
    )
    .toBeLessThanOrEqual(1);
}
