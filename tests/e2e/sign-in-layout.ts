import { expect, type Locator } from '@playwright/test';

export async function assertArea(scroll: Locator, mobile: boolean) {
  const layout = await scroll.evaluate((element) => {
    const content = element.firstElementChild!.firstElementChild!;
    return {
      gap: element.getBoundingClientRect().right - content.getBoundingClientRect().right,
      top: parseFloat(getComputedStyle(content).paddingTop),
      overflow: element.scrollWidth > element.clientWidth,
      overflowingChildren: [...content.querySelectorAll('*')].some(
        (child) => child.getBoundingClientRect().right > content.getBoundingClientRect().right + 1,
      ),
    };
  });
  expect(layout.gap).toBeGreaterThanOrEqual(mobile ? 20 : 24);
  expect(layout.top).toBeGreaterThanOrEqual(4);
  expect(layout.overflow).toBe(false);
  expect(layout.overflowingChildren).toBe(false);
  const track = scroll.locator('..').locator('[data-orientation="vertical"]');
  if (await track.count()) {
    if (mobile) await expect(track).toHaveCSS('visibility', 'hidden');
    else {
      await scroll.locator('..').hover();
      await expect(track).toHaveCSS('opacity', '1');
    }
  }
}
