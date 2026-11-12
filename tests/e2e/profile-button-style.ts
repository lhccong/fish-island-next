import { expect, type Page } from '@playwright/test';

export async function checkProfileButtons(page: Page, primaryLabel = '保存修改') {
  await page.mouse.move(0, 0);
  const save = page.getByRole('button', { name: primaryLabel, exact: true });
  const cancel = page.getByRole('button', { name: '取消', exact: true });
  const mobile = page.viewportSize()!.width <= 760;
  for (const button of [save, cancel]) {
    const box = (await button.boundingBox())!;
    expect(box.height).toBe(mobile ? 44 : 32);
    expect(box.width).toBeLessThanOrEqual(mobile ? 104 : 96);
    expect(await button.evaluate((element) => getComputedStyle(element).fontSize)).toBe(
      mobile ? '14px' : '13px',
    );
  }
  const colors = await save.evaluate((element) => {
    const probe = document.createElement('span');
    probe.style.backgroundColor = 'var(--color-action)';
    probe.style.color = 'var(--color-on-accent)';
    element.appendChild(probe);
    const expected = getComputedStyle(probe);
    const actual = getComputedStyle(element);
    const result = {
      bg: actual.backgroundColor,
      fg: actual.color,
      expectedBg: expected.backgroundColor,
      expectedFg: expected.color,
    };
    probe.remove();
    return result;
  });
  expect(colors.bg).toBe(colors.expectedBg);
  expect(colors.fg).toBe(colors.expectedFg);
  const luminance = (color: string) => {
    const values = color
      .match(/[\d.]+/g)!
      .slice(0, 3)
      .map(Number)
      .map((value) => {
        const v = value / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
    return values[0]! * 0.2126 + values[1]! * 0.7152 + values[2]! * 0.0722;
  };
  const bg = luminance(colors.bg),
    fg = luminance(colors.fg);
  expect((Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05)).toBeGreaterThanOrEqual(4.5);
  await save.hover();
  expect(await save.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(
    colors.bg,
  );
  await cancel.focus();
  await page.keyboard.press('Tab');
  await expect(save).toBeFocused();
  expect(await save.evaluate((element) => getComputedStyle(element).outlineWidth)).toBe('2px');
}
