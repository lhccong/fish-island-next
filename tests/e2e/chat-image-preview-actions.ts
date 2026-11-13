import { expect, type Page, type TestInfo } from '@playwright/test';

export async function verifyChatImagePreview(page: Page, info: TestInfo) {
  const scroll = page.getByRole('region', { name: '群聊消息区', exact: true });
  await scroll.evaluate((el) => {
    el.scrollTop = 0;
  });
  const image = page
    .locator('[data-message-id="1794530000001"]')
    .getByRole('button', { name: '放大聊天图片', exact: true });
  await expect(image).toBeEnabled();
  // 等待发送确认后的虚拟列表测量和跟随滚动完成，再记录预览前的位置。
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await image.scrollIntoViewIfNeeded();
  const thumbnail = (await image.boundingBox())!;
  expect(thumbnail.width).toBeLessThanOrEqual(214);
  expect(thumbnail.height).toBeLessThanOrEqual(161);
  const top = await scroll.evaluate((el) => el.scrollTop);
  if (page.viewportSize()!.width <= 760) await image.tap();
  else await image.click();
  const preview = page.getByRole('dialog', { name: '图片预览', exact: true });
  await expect(preview).toBeVisible();
  const big = preview.getByRole('img', { name: '聊天图片大图', exact: true });
  await expect(big).toBeVisible();
  await expect(preview.locator('[data-preview-state]')).toHaveAttribute(
    'data-preview-state',
    'ready',
  );
  expect((await big.boundingBox())!.width).toBeGreaterThan(thumbnail.width);
  const bounds = (await preview.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.screenshot({ path: info.outputPath('chat-image-preview.png') });
  await big.dispatchEvent('error');
  await expect(preview.getByRole('alert')).toContainText('图片加载失败');
  await preview.getByRole('button', { name: '重试加载大图' }).click();
  await expect(preview.locator('[data-preview-state]')).toHaveAttribute(
    'data-preview-state',
    'ready',
  );
  if (page.viewportSize()!.width <= 760)
    await preview.getByRole('button', { name: '关闭图片预览' }).tap();
  else await page.keyboard.press('Escape');
  await expect(preview).not.toBeVisible();
  await expect(image).toBeFocused();
  expect(Math.abs((await scroll.evaluate((el) => el.scrollTop)) - top)).toBeLessThanOrEqual(1);
  await expect(page.getByRole('textbox', { name: '消息草稿' })).toHaveValue('保留草稿');
  await expect(page.getByRole('region', { name: '引用消息', exact: true })).toBeVisible();
}
