import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';

export async function scrollToEnd(page: Page, scroll: Locator, touch = false) {
  if (touch) {
    const session = await page.context().newCDPSession(page);
    try {
      const box = (await scroll.boundingBox())!;
      const x = box.x + box.width / 2;
      const y = box.y + box.height - 16;
      for (let swipe = 0; swipe < 8; swipe++) {
        const remaining = await scroll.evaluate(
          (el) => el.scrollHeight - el.clientHeight - el.scrollTop,
        );
        if (remaining < 48) break;
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        });
        for (let step = 1; step <= 5; step++) {
          await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y - ((box.height - 32) * step) / 5 }],
          });
        }
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      }
    } finally {
      await session.detach();
    }
  } else {
    await scroll.hover();
    await page.mouse.wheel(0, 5000);
  }
  await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
}

export async function openEmoticonActions(page: Page) {
  const tile = page.getByRole('button', { name: '使用表情包 1', exact: true });
  if (page.viewportSize()!.width <= 760)
    await page.getByRole('button', { name: '表情包 1 操作', exact: true }).tap();
  else await tile.click({ button: 'right' });
  await expect(page.getByRole('menu', { name: '表情包 1 操作', exact: true })).toBeVisible();
}

export async function verifyEmoticonPreview(page: Page, info: TestInfo) {
  const tile = page.getByRole('button', { name: '使用表情包 1', exact: true });
  const panel = page.getByRole('dialog', { name: '表情包', exact: true });
  await expect(panel.getByRole('button', { name: /^移除/ })).toHaveCount(0);
  const before = await tile.boundingBox();
  if (page.viewportSize()!.width > 760) {
    await tile.hover();
    const tooltip = page.getByRole('tooltip', { name: '表情包 1 放大预览' });
    await expect(tooltip).toBeVisible();
    const box = (await tooltip.boundingBox())!;
    expect(box.width).toBeGreaterThan(before!.width);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    expect(await tile.boundingBox()).toEqual(before);
    await page.screenshot({ path: info.outputPath('hover-preview.png') });
    await tooltip.getByRole('img').dispatchEvent('error');
    await expect(tooltip.getByText('图片加载失败，请关闭后重试')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tooltip).not.toBeVisible();
    await expect(panel).toBeVisible();
    await tile.focus();
    await tile.press('Shift+F10');
    await expect(page.getByRole('menu', { name: '表情包 1 操作' })).toBeVisible();
    await page.getByRole('menuitem', { name: '放大预览', exact: true }).focus();
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(tile).toBeFocused();
  } else {
    await openEmoticonActions(page);
    const action = page.getByRole('button', { name: '表情包 1 操作', exact: true });
    expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.getByRole('menuitem', { name: '放大预览', exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(panel).toBeVisible();
  }
  await openEmoticonActions(page);
  await page.getByRole('menuitem', { name: '放大预览', exact: true }).click();
  const preview = page.getByRole('dialog', { name: '表情包预览', exact: true });
  await expect(preview).toBeVisible();
  await expect(preview.getByRole('img', { name: '表情包放大图片' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('dialog-preview.png') });
  await preview.getByRole('img').dispatchEvent('error');
  await expect(preview.getByText('图片加载失败，请关闭后重试')).toBeVisible();
  await preview.getByRole('button', { name: '关闭预览' }).click();
  await expect(preview).not.toBeVisible();
  await expect(panel).toBeVisible();
  await expect(tile).toBeFocused();
}
