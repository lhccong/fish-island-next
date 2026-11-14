import { expect, type Locator } from '@playwright/test';

export async function assertArea(scroll: Locator, mobile: boolean) {
  const spacing = await scroll.evaluate((element) => {
    const child = element.firstElementChild!.firstElementChild!;
    return {
      gap: element.getBoundingClientRect().right - child.getBoundingClientRect().right,
      top: parseFloat(getComputedStyle(child).paddingTop),
      overflow: element.scrollWidth > element.clientWidth,
    };
  });
  expect(spacing.gap).toBeGreaterThanOrEqual(mobile ? 20 : 24);
  expect(spacing.top).toBeGreaterThanOrEqual(4);
  expect(spacing.overflow).toBe(false);
}
