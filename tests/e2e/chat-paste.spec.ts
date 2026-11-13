import { test, expect, type Page, type Route } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(60000);

async function pasteImage(page: Page, count = 1) {
  return page.getByRole('textbox', { name: '消息草稿' }).evaluate(async (element, count) => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 200;
    const context = canvas.getContext('2d')!;
    const pixels = context.createImageData(320, 200);
    let seed = 19;
    for (let i = 0; i < pixels.data.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      pixels.data[i] = i % 4 === 3 ? 255 : seed >>> 24;
    }
    context.putImageData(pixels, 0, 0);
    const original = await new Promise<Blob>((resolve) =>
      canvas.toBlob((blob) => resolve(blob!), 'image/png'),
    );
    const data = new DataTransfer();
    for (let i = 0; i < count; i++)
      data.items.add(new File([original], `synthetic-${i}.png`, { type: 'image/png' }));
    element.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    );
    return original.size;
  }, count);
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    test(`${skin.id} ${mode}: paste upload, retry, remove and send`, async ({ page }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      const send = page.getByRole('button', { name: '发送', exact: true });
      const composer = page.getByRole('region', { name: '群聊输入区', exact: true });
      const attachment = page.getByRole('region', { name: '待发送图片', exact: true });
      await expect(attachment).toHaveCount(0);
      await draft.focus();
      await draft.evaluate((element) => {
        const clipboardData = new DataTransfer();
        clipboardData.setData('text/plain', '普通粘贴');
        element.dispatchEvent(
          new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
        );
      });
      await expect(draft).toHaveText('普通粘贴');
      let held!: Route;
      let uploads = 0;
      await page.route('**/api/file/minio/upload?biz=user_file', (route) => {
        uploads++;
        held = route;
      });
      await draft.fill('保留文字草稿');
      await pasteImage(page, 2);
      await expect(composer).toContainText('一次只能粘贴一张图片');
      expect(uploads).toBe(0);
      const originalSize = await pasteImage(page);
      await expect(attachment).toContainText('图片上传中');
      await expect(send).toBeDisabled();
      await expect.poll(() => uploads).toBe(1);
      expect(held.request().headers()['content-type']).toContain('multipart/form-data');
      expect(originalSize).toBeLessThan(1024 * 1024);
      expect(held.request().postDataBuffer()!.byteLength).toBeLessThan(originalSize);
      expect(held.request().postData()).toContain('filename="pasted-image.webp"');
      await draft.fill('上传时可继续编辑');
      await page.screenshot({ path: info.outputPath('uploading.png') });
      await held.fulfill({ json: { code: 50000 } });
      await expect(attachment).toContainText('图片上传失败');
      await page.screenshot({ path: info.outputPath('error.png') });
      await expect(draft).toHaveText('上传时可继续编辑');
      await attachment.getByRole('button', { name: '重试上传' }).click();
      await expect.poll(() => uploads).toBe(2);
      await held.fulfill({ json: { code: 0, data: 'https://menu.test/image.png' } });
      await expect(attachment).toHaveAttribute('data-ready', 'true');
      await expect(attachment.getByRole('status')).toHaveCount(0);
      await expect(attachment.getByRole('button', { name: '移除图片' })).toHaveText('');
      expect((await attachment.boundingBox())!.width).toBeLessThanOrEqual(88);
      await expect(attachment.getByRole('img')).toBeVisible();
      await pasteImage(page);
      await expect(composer).toContainText('请先发送或移除当前图片');
      expect(uploads).toBe(2);
      await page.screenshot({ path: info.outputPath('ready.png') });
      const bounds = await attachment.evaluate((el) => ({
        scroll: el.scrollWidth,
        client: el.clientWidth,
      }));
      expect(bounds.scroll).toBeLessThanOrEqual(bounds.client);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const remove = attachment.getByRole('button', { name: '移除图片' });
      expect((await remove.boundingBox())!.height).toBeGreaterThanOrEqual(
        page.viewportSize()!.width <= 760 ? 44 : 32,
      );
      await remove.click();
      await expect(draft).toBeFocused();
      await expect(attachment).toHaveCount(0);
      await expect(draft).toHaveText('上传时可继续编辑');
      await draft.fill('');
      await pasteImage(page);
      await expect.poll(() => uploads).toBe(3);
      await held.fulfill({ json: { code: 0, data: 'https://menu.test/image.png' } });
      await expect(send).toBeEnabled();
      let sent = '';
      await page.route('**/api/chat/message/send', (route) => {
        const input = route.request().postDataJSON() as {
          content: string;
          clientMessageId: string;
        };
        sent = input.content;
        return route.fulfill({
          json: {
            code: 0,
            data: {
              message: {
                id: '1794538888999',
                content: input.content,
                clientMessageId: input.clientMessageId,
                sender: { id: '123', name: '本人合成' },
                timestamp: 1794538888999,
              },
            },
          },
        });
      });
      await send.click();
      await expect.poll(() => sent).toBe('[img]https://menu.test/image.png[/img]');
      await expect(attachment).toHaveCount(0);
      await expect(draft).toHaveText('');
      expect(fixture.stats().connections).toBe(1);
      await pasteImage(page);
      await expect.poll(() => uploads).toBe(4);
      await attachment.getByRole('button', { name: '移除图片' }).click();
      await expect(attachment).toHaveCount(0);
      await expect(send).toBeDisabled();
    });

test('large static image compression preserves transparency and bounds', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const modulePath = '/src/features/chat/prepare-image.ts';
    const { prepareChatImage } = (await import(modulePath)) as {
      prepareChatImage: (file: File, signal: AbortSignal) => Promise<File>;
    };
    const canvas = document.createElement('canvas');
    canvas.width = 2200;
    canvas.height = 600;
    const context = canvas.getContext('2d')!;
    const pixels = context.createImageData(canvas.width, canvas.height);
    let seed = 19;
    for (let i = 0; i < pixels.data.length; i += 4) {
      for (let channel = 0; channel < 3; channel++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        pixels.data[i + channel] = seed >>> 24;
      }
      pixels.data[i + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    context.clearRect(0, 0, 32, 32);
    const original = await new Promise<Blob>((resolve) =>
      canvas.toBlob((blob) => resolve(blob!), 'image/png'),
    );
    const file = await prepareChatImage(
      new File([original], 'large.png', { type: 'image/png' }),
      new AbortController().signal,
    );
    const bitmap = await createImageBitmap(file);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);
    const alpha = context.getImageData(0, 0, 1, 1).data[3];
    const result = {
      original: original.size,
      size: file.size,
      type: file.type,
      width: bitmap.width,
      height: bitmap.height,
      alpha,
    };
    bitmap.close();
    return result;
  });
  expect(result.original).toBeGreaterThan(1024 * 1024);
  expect(result.size).toBeLessThanOrEqual(256 * 1024);
  expect(result.type).toBe('image/webp');
  expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(2000);
  expect(result.alpha).toBe(0);
});

test('theme and mode changes preserve upload, text and combined send', async ({ page }) => {
  const fixture = await setupChatMenu(page, 'wechat', 'light');
  let held!: Route;
  let uploads = 0;
  await page.route('**/api/file/minio/upload?biz=user_file', (route) => {
    uploads++;
    held = route;
  });
  const draft = page.getByRole('textbox', { name: '消息草稿' });
  await draft.fill('图片附带文字');
  await pasteImage(page);
  await expect.poll(() => uploads).toBe(1);
  for (const skin of builtinSkins)
    for (const mode of ['light', 'dark']) {
      await page.evaluate(
        async ({ skin, mode }) => {
          const modulePath = '/src/features/appearance/index.ts';
          const { useAppearanceStore } = (await import(modulePath)) as {
            useAppearanceStore: {
              getState(): { setSkinId(id: string): void; setColorMode(mode: string): void };
            };
          };
          useAppearanceStore.getState().setSkinId(skin);
          useAppearanceStore.getState().setColorMode(mode);
        },
        { skin: skin.id, mode },
      );
      await expect(page.getByRole('region', { name: '待发送图片', exact: true })).toContainText(
        '图片上传中',
      );
      await expect(draft).toHaveText('图片附带文字');
      expect(uploads).toBe(1);
      expect(fixture.stats().connections).toBe(1);
      expect(fixture.stats().historyRequests).toBe(1);
    }
  await held.fulfill({ json: { code: 0, data: 'https://menu.test/image.png' } });
  await expect(page.getByRole('button', { name: '发送', exact: true })).toBeEnabled();
  let content = '';
  await page.route('**/api/chat/message/send', (route) => {
    content = (route.request().postDataJSON() as { content: string }).content;
    return route.fulfill({ json: { code: 50000 } });
  });
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect.poll(() => content).toBe('[img]https://menu.test/image.png[/img]图片附带文字');
  await expect(page.getByRole('button', { name: '重试发送' })).toBeVisible();
  expect(uploads).toBe(1);
});
