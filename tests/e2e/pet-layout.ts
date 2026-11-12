import { expect, type Page } from '@playwright/test';
export async function assertPetLayout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const dialog = page.getByRole('dialog').last();
  if (await dialog.count()) {
    const result = await dialog.evaluate((element) => {
      const viewport = element.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
      if (!viewport) return null;
      const root = viewport.parentElement!;
      const content = viewport.firstElementChild!;
      const body = content.firstElementChild!;
      return {
        padding: parseFloat(getComputedStyle(viewport).paddingRight),
        width: viewport.clientWidth,
        contentWidth: viewport.scrollWidth,
        rightGap: root.getBoundingClientRect().right - body.getBoundingClientRect().right,
        topGap: body.getBoundingClientRect().top - viewport.getBoundingClientRect().top,
        dialogRight: element.getBoundingClientRect().right,
        dialogLeft: element.getBoundingClientRect().left,
      };
    });
    if (result) {
      expect(result.padding).toBeGreaterThanOrEqual(page.viewportSize()!.width <= 760 ? 20 : 24);
      expect(result.rightGap).toBeGreaterThanOrEqual(page.viewportSize()!.width <= 760 ? 20 : 24);
      expect(result.contentWidth).toBeLessThanOrEqual(result.width + 1);
      expect(result.dialogLeft).toBeGreaterThanOrEqual(0);
      expect(result.dialogRight).toBeLessThanOrEqual(page.viewportSize()!.width);
    }
  }
}
