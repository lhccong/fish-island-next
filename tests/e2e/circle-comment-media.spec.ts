import { test, expect } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setup, noOverflow } from './fish-circle-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: comment paste and saved emoticons`, async ({ page }, info) => {
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skin: skin.id, mode },
      );
      await setup(page);
      let fail = true;
      let empty = false;
      await page.route('**/api/emoticon_favour/list/page', (route) =>
        route.fulfill({
          json: fail
            ? { code: 40000, message: '合成收藏失败' }
            : {
                code: 0,
                data: {
                  total: empty ? 0 : 1,
                  records: empty ? [] : [{ id: '1', emoticonSrc: 'https://circle.test/image.png' }],
                },
              },
        }),
      );
      const section = page.getByRole('region', { name: '评论区', exact: true });
      await page.getByRole('button', { name: '评论 0', exact: true }).click();
      const editor = section.getByRole('textbox', { name: '评论内容' });
      await editor.fill('保留草稿');
      const paste = async (count = 1) =>
        editor.evaluate((element, count) => {
          const data = new DataTransfer();
          for (let i = 0; i < count; i++)
            data.items.add(
              new File([new Uint8Array([137, 80, 78, 71])], `paste${i}.png`, { type: 'image/png' }),
            );
          element.dispatchEvent(
            new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }),
          );
        }, count);
      await paste();
      await expect(section.getByRole('img', { name: '评论附件 1' })).toBeVisible();
      await expect(editor).toHaveValue('保留草稿');
      const launcher = section.getByRole('button', { name: '评论表情包', exact: true });
      await launcher.click();
      const panel = page.getByRole('dialog', { name: '评论表情包', exact: true });
      await panel.getByRole('button', { name: '重试表情包' }).click();
      fail = false;
      empty = true;
      await panel.getByRole('button', { name: '重试表情包' }).click();
      await expect(panel.getByText(/还没有收藏表情包/)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(launcher).toBeFocused();
      empty = false;
      await launcher.click();
      await expect(panel.getByRole('button', { name: '选择表情包 1' })).toBeVisible();
      const panelBox = (await panel.boundingBox())!;
      expect(panelBox.x).toBeGreaterThanOrEqual(0);
      expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      await page.screenshot({ path: info.outputPath('comment-emoticons.png') });
      await panel.getByRole('button', { name: '选择表情包 1' }).click();
      await expect(panel).toBeHidden();
      await expect(section.getByRole('img', { name: '评论附件 2' })).toBeVisible();
      await paste(2);
      await expect(section.getByRole('alert')).toContainText('最多添加 3 张');
      await section.getByRole('button', { name: '移除评论附件 1' }).click();
      await page.route('**/api/file/minio/upload?biz=user_post', (route) =>
        route.fulfill({ status: 503, json: {} }),
      );
      await paste();
      await expect(section.getByRole('alert')).toBeVisible();
      await expect(editor).toHaveValue('保留草稿');
      await noOverflow(page);
      expect(await section.locator('form').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
        true,
      );
      await page.screenshot({ path: info.outputPath('comment-media.png') });
      const sent = page.waitForRequest('**/api/moments/comment/add');
      await section.getByRole('button', { name: '发送评论' }).click();
      const body = (await sent).postDataJSON();
      expect(body.content).toBe('保留草稿[img:https://circle.test/image.png]');
      expect(JSON.stringify(body)).toContain('https://circle.test/image.png');
      await expect(editor).toHaveValue('');
    });
  }
