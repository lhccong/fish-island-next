import type { Locator, Page } from '@playwright/test';

export async function scrollChapter(page: Page, viewport: Locator, touch: boolean) {
  const bounds = (await viewport.boundingBox())!;
  const x = Math.round(bounds.x + bounds.width / 2);
  const y = Math.round(bounds.y + bounds.height * 0.85);
  if (!touch) {
    await page.mouse.move(x, y);
    await page.mouse.wheel(0, 560);
    return;
  }
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (const fraction of [0.1, 0.25, 0.4, 0.55, 0.7])
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: Math.round(y - bounds.height * fraction) }],
      });
    // Let the finger come to rest before releasing so the next tap is not consumed by a fling.
    await new Promise((resolve) => setTimeout(resolve, 180));
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await session.detach();
  }
}
