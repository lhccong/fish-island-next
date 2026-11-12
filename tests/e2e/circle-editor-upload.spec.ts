import { expect, test } from '@playwright/test';
import { setup } from './fish-circle-fixture';

test('legacy publisher handles pasted images, upload failure and nine-image limit', async ({
  page,
}) => {
  await setup(page);
  let uploaded = 0;
  let fail = true;
  await page.route('**/api/file/minio/upload?biz=user_post', (route) => {
    if (fail) return route.fulfill({ json: { code: 40000, message: '合成图片上传失败' } });
    uploaded++;
    return route.fulfill({
      json: { code: 0, data: `https://circle.test/image.png?number=${uploaded}` },
    });
  });
  await page.route('https://circle.test/image.png?*', (route) =>
    route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+afo0AAAAASUVORK5CYII=',
        'base64',
      ),
    }),
  );
  await page.getByRole('button', { name: '发布动态', exact: true }).click();
  const editor = page.getByRole('dialog', { name: '发布朋友圈', exact: true });
  const file = { name: 'synthetic.png', mimeType: 'image/png', buffer: Buffer.from('synthetic') };
  await editor.locator('input[type=file]').setInputFiles(file);
  await expect(editor.getByRole('alert')).toHaveText('合成图片上传失败');
  fail = false;
  await editor.getByRole('textbox', { name: '动态内容' }).evaluate((element) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array([1, 2, 3])], 'paste.png', { type: 'image/png' }));
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData: transfer }));
  });
  await expect(editor.getByRole('img', { name: '待发布图片 1' })).toBeVisible();
  await expect(editor.getByRole('alert')).toHaveCount(0);
  await editor
    .locator('input[type=file]')
    .setInputFiles(Array.from({ length: 10 }, (_, i) => ({ ...file, name: `synthetic-${i}.png` })));
  await expect(editor.getByRole('img')).toHaveCount(9);
  await expect(editor.getByRole('button', { name: '添加图片', exact: true })).toBeDisabled();
  expect(uploaded).toBe(9);
  await editor.getByRole('button', { name: '移除附件 9' }).click();
  await expect(editor.getByRole('img')).toHaveCount(8);
  await expect(editor.getByRole('button', { name: '添加图片', exact: true })).toBeEnabled();
});
