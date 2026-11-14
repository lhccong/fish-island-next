import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(60000);

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: compact composer and expandable tools`, async ({ page }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const mobile = page.viewportSize()!.width <= 760;
      const composer = page.getByRole('region', { name: '群聊输入区', exact: true });
      const editor = page.getByRole('textbox', { name: '消息草稿', exact: true });
      const more = page.getByRole('button', { name: '更多聊天工具' });
      const send = page.getByRole('button', { name: '发送', exact: true });
      await expect(send).toBeDisabled();
      const initialHeight = (await composer.boundingBox())!.height;
      if (mobile) {
        expect(initialHeight).toBeLessThanOrEqual(64);
        await expect(page.getByRole('button', { name: '发红包', exact: true })).toBeHidden();
        await more.tap();
        await expect(more).toHaveAttribute('aria-expanded', 'true');
        const packet = page.getByRole('button', { name: '发红包', exact: true });
        await packet.tap();
        await expect(page.getByRole('dialog', { name: '发送红包', exact: true })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(packet).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(more).toHaveAttribute('aria-expanded', 'false');
        await expect(more).toBeFocused();
        await editor.tap();
      } else {
        await expect(more).toBeHidden();
        await expect(editor).toHaveCSS('height', skin.id === 'wps' ? '32px' : '86px');
      }
      await editor.fill('简短草稿');
      await expect(send).toBeEnabled();
      await expect(composer).toHaveJSProperty(
        'scrollWidth',
        await composer.evaluate((e) => e.clientWidth),
      );
      await page.screenshot({ path: info.outputPath('compact.png') });
      if (mobile) {
        await editor.press('Enter');
        await editor.pressSequentially('第二行');
        await expect(editor).toHaveText('简短草稿\n第二行', { useInnerText: true });
        expect((await composer.boundingBox())!.height).toBeGreaterThan(initialHeight);
        await editor.fill('多行内容\n'.repeat(30));
        expect((await editor.boundingBox())!.height).toBeLessThanOrEqual(120);
        await editor.evaluate((element) => {
          element.scrollTop = element.scrollHeight;
        });
        expect(await editor.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
        await editor.press('ControlOrMeta+End');
        await expect(editor).toBeInViewport();
      }
      await editor.fill('发送失败保留可重试消息');
      const upload = page.getByRole('button', { name: '上传图片', exact: true });
      await expect(upload).toBeVisible();
      expect((await upload.boundingBox())!.width).toBeGreaterThanOrEqual(44);
      const choose = async () => {
        const chooser = page.waitForEvent('filechooser');
        if (mobile) await upload.tap();
        else await upload.click();
        return chooser;
      };
      await (await choose()).setFiles([]);
      await expect(page.getByRole('region', { name: '待发送图片', exact: true })).toHaveCount(0);
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      let uploads = 0;
      await page.route('**/api/file/minio/upload?biz=user_file', async (route) => {
        uploads++;
        if (uploads === 1) {
          await pending;
          await route.fulfill({ status: 503 });
        } else await route.fulfill({ json: { code: 0, data: 'https://menu.test/image.png' } });
      });
      const png = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 24;
        canvas.getContext('2d')!.fillRect(0, 0, 32, 24);
        return canvas.toDataURL('image/png').split(',')[1]!;
      });
      await (
        await choose()
      ).setFiles({
        name: 'synthetic.png',
        mimeType: 'image/png',
        buffer: Buffer.from(png, 'base64'),
      });
      const attachment = page.getByRole('region', { name: '待发送图片', exact: true });
      await expect(attachment).toContainText('图片上传中');
      await expect(send).toBeDisabled();
      await expect(upload).toBeDisabled();
      await expect.poll(() => uploads).toBe(1);
      release();
      await expect(attachment).toContainText('图片上传失败');
      await attachment.getByRole('button', { name: '重试上传' }).click();
      await expect(attachment.getByRole('img')).toBeVisible();
      await expect(send).toBeEnabled();
      await expect(editor).toHaveText('发送失败保留可重试消息');
      await page.screenshot({ path: info.outputPath('selected-image.png') });
      await page.route('**/api/chat/message/send', (route) => route.fulfill({ status: 503 }));
      if (mobile) await send.tap();
      else await send.click();
      await expect(page.getByRole('button', { name: '重试发送', exact: true })).toBeVisible();
      await expect(editor).toHaveText('');
      await expect(attachment).toHaveCount(0);
      await expect(upload).toBeEnabled();
      expect((await composer.boundingBox())!.height).toBe(initialHeight);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(fixture.stats().connections).toBe(1);
    });
  }
