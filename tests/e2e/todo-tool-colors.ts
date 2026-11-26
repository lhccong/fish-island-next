import { expect, type Locator, type Page } from '@playwright/test';

type Activate = (locator: Locator) => Promise<void>;

export async function chooseDraftColor(page: Page, dialog: Locator, activate: Activate) {
  const tone = dialog.getByRole('button', { name: '描述底色' });
  await activate(tone);
  await expect(tone).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(tone).toBeFocused();
  await activate(tone);
  await activate(dialog.getByRole('button', { name: '浅绿' }));
  const hex = dialog.getByRole('textbox', { name: 'HEX 颜色' });
  await expect(hex).toHaveValue('#CDE4D8');
  await hex.fill('#123');
  await expect(dialog.getByRole('button', { name: '应用' })).toBeDisabled();
  await hex.fill('#123456');
  await activate(dialog.getByRole('button', { name: '应用' }));
  await expect(tone).toBeFocused();
}

export async function checkRowColor(
  page: Page,
  item: Locator,
  activate: Activate,
  screenshotPath?: string,
) {
  const mobile = page.viewportSize()!.width <= 760;
  const description = item.locator('[data-todo-description]').locator('..');
  await expect(description).toHaveCSS('background-color', 'rgb(18, 52, 86)');
  await expect(description).toHaveCSS('color', 'rgb(255, 255, 255)');
  const paletteTrigger = item.getByRole('button', { name: '描述底色' });
  await activate(paletteTrigger);
  const palette = page.getByRole('dialog', { name: '描述底色' });
  const paletteBody = palette.getByRole('region', { name: '描述底色滚动区' });
  const swatch = palette.getByRole('button', { name: '浅绿' });
  expect(
    await swatch.evaluate((node) => parseFloat(getComputedStyle(node, '::after').width)),
  ).toBeGreaterThan(20);
  expect(
    await paletteBody.evaluate((node) => [
      node.scrollWidth - node.clientWidth,
      parseInt(getComputedStyle(node).paddingInlineEnd),
    ]),
  ).toEqual([0, mobile ? 20 : 24]);
  const plane = palette.getByRole('button', { name: /饱和度.*明度/ });
  const pickerHex = palette.getByRole('textbox', { name: 'HEX 颜色' });
  await expect(pickerHex).toHaveValue('#123456');
  await activate(plane);
  await expect(pickerHex).not.toHaveValue('#123456');
  await plane.press('ArrowRight');
  await palette.getByRole('slider', { name: '色相' }).press('ArrowRight');
  if (screenshotPath) await page.screenshot({ path: screenshotPath });
  await page.keyboard.press('Escape');
  await expect(paletteTrigger).toBeFocused();
  await activate(paletteTrigger);
  await pickerHex.fill('#F4E6CF');
  await activate(palette.getByRole('button', { name: '应用' }));
  await expect(description).toHaveCSS('background-color', 'rgb(244, 230, 207)');
  await expect(description).toHaveCSS('color', 'rgb(0, 0, 0)');
  await activate(paletteTrigger);
  await activate(palette.getByRole('button', { name: '恢复默认' }));
  await activate(palette.getByRole('button', { name: '应用' }));
  await expect(description).not.toHaveCSS('background-color', 'rgb(244, 230, 207)');
}
