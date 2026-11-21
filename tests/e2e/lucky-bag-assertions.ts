import { expect, type Locator, type Page } from '@playwright/test';

export async function openLuckyBagForm(page: Page, act: (target: Locator) => Promise<void>) {
  const moreTools = page.getByRole('button', { name: '更多聊天工具', exact: true });
  if ((await moreTools.isVisible()) && (await moreTools.getAttribute('aria-haspopup')) === 'menu') {
    await act(moreTools);
    await expect(page.getByRole('menuitem', { name: '进行中的福袋' })).toHaveCount(0);
    await act(page.getByRole('menuitem', { name: '发福袋', exact: true }));
    return moreTools;
  }
  const launcher = page.getByRole('button', { name: '发福袋', exact: true });
  if (!(await launcher.isVisible())) await act(moreTools);
  await expect(launcher).toHaveCSS('width', '44px');
  await act(launcher);
  return launcher;
}

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
