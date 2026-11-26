import { test, expect, type Route, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { scrollToEnd } from './emoticon-actions';

test.setTimeout(60000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: upload a local favorite`, async ({ page }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const url = 'https://menu.test/image.png';
      let list: Route | undefined;
      let uploaded: Route | undefined;
      let saving: Route | undefined;
      let uploads = 0;
      let saves = 0;
      await page.route('**/api/emoticon_favour/list/page', (route) => {
        list = route;
      });
      await page.route('**/api/file/minio/upload?biz=user_file', (route) => {
        uploads++;
        expect(route.request().postData()).toContain('filename="sticker.gif"');
        uploaded = route;
      });
      await page.route('**/api/emoticon_favour/add', (route) => {
        saves++;
        expect(route.request().postData()).toBe(url);
        saving = route;
      });
      const mobile = page.viewportSize()!.width <= 760;
      const activate = (button: Locator) => (mobile ? button.tap() : button.click());
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('保留草稿');
      const open = page.getByRole('button', { name: '表情包', exact: true });
      await activate(open);
      const panel = page.getByRole('dialog', { name: '表情包', exact: true });
      await activate(panel.getByRole('button', { name: '我的收藏' }));
      const add = panel.getByRole('button', { name: '上传本地表情包' });
      await expect(panel.getByText('正在加载表情包…')).toBeVisible();
      await expect(add).toBeEnabled();
      await expect.poll(() => Boolean(list)).toBe(true);
      await list!.fulfill({ json: { code: 50001, message: '合成列表失败' } });
      list = undefined;
      await expect(panel.getByText('合成列表失败')).toBeVisible();
      await expect(add).toBeEnabled();
      await activate(panel.getByRole('button', { name: '重试表情包' }));
      await expect.poll(() => Boolean(list)).toBe(true);
      await list!.fulfill({ json: { code: 0, data: { records: [], total: '0' } } });
      list = undefined;
      await expect(panel.getByText(/还没有收藏/)).toBeVisible();

      const choose = async (file: { name: string; mimeType: string; buffer: Buffer }) => {
        const chooser = page.waitForEvent('filechooser');
        if (mobile) await add.tap();
        else {
          await add.hover();
          await add.focus();
          await expect(add).toBeFocused();
          await add.press('Enter');
        }
        await (await chooser).setFiles(file);
      };
      const gif = {
        name: 'sticker.gif',
        mimeType: 'image/gif',
        buffer: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
      };
      await choose({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('test') });
      await expect(panel.getByText('仅支持 PNG、JPEG、WebP、GIF 图片')).toBeVisible();
      expect(uploads).toBe(0);
      await choose(gif);
      await expect(panel.getByText('正在上传表情包…')).toBeVisible();
      await expect(add).toBeDisabled();
      await expect.poll(() => Boolean(uploaded)).toBe(true);
      await uploaded!.fulfill({ json: { code: 50001 } });
      uploaded = undefined;
      await expect(panel.getByText('图片上传失败，请重试')).toBeVisible();
      await expect(panel.getByText(/还没有收藏/)).toBeVisible();
      expect(saves).toBe(0);

      await choose(gif);
      await expect.poll(() => Boolean(uploaded)).toBe(true);
      await uploaded!.fulfill({ json: { code: 0, data: url } });
      await expect(panel.getByText('正在保存表情包…')).toBeVisible();
      await expect(add).toBeDisabled();
      await expect.poll(() => Boolean(saving)).toBe(true);
      await saving!.fulfill({ json: { code: 0, data: true } });
      await expect(panel.getByText('已添加到表情包')).toBeVisible();
      await expect.poll(() => Boolean(list)).toBe(true);
      const records = Array.from({ length: 24 }, (_, index) => ({
        id: String(index + 1),
        emoticonSrc: url,
      }));
      await list!.fulfill({ json: { code: 0, data: { records, total: '24' } } });
      const first = panel.getByRole('button', { name: '使用表情包 1', exact: true });
      await expect(first).toBeVisible();
      const addBox = (await add.boundingBox())!;
      const firstBox = (await first.boundingBox())!;
      expect(addBox.y).toBe(firstBox.y);
      expect(addBox.x).toBeLessThan(firstBox.x);
      expect(addBox.width).toBeGreaterThanOrEqual(44);
      expect(addBox.height).toBeGreaterThanOrEqual(44);
      expect(Math.abs(addBox.height - firstBox.height)).toBeLessThanOrEqual(1);
      const scroll = panel.getByRole('region', { name: '表情包列表' });
      await expect(scroll.locator('..').locator('[data-orientation="vertical"]')).toHaveCSS(
        'visibility',
        mobile ? 'hidden' : 'visible',
      );
      expect(await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      const viewport = (await scroll.boundingBox())!;
      const edge = (await panel
        .getByRole('button', { name: `使用表情包 ${mobile ? 2 : 3}`, exact: true })
        .boundingBox())!;
      expect(edge.y).toBe(addBox.y);
      expect(viewport.x + viewport.width - edge.x - edge.width).toBeGreaterThanOrEqual(
        mobile ? 20 : 24,
      );
      if (skin.id === 'wechat')
        await page.screenshot({ path: info.outputPath('local-favorite.png') });
      await scrollToEnd(page, scroll, mobile);
      const last = panel.getByRole('button', { name: '使用表情包 24', exact: true });
      await last.focus();
      await expect(last).toBeInViewport();
      await add.focus();
      await expect(add).toBeInViewport();
      await page.mouse.move(0, 0);
      await expect(page.getByRole('tooltip')).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(panel).not.toBeVisible();
      await expect(open).toBeFocused();
      await expect(draft).toHaveText('保留草稿');
      expect(fixture.stats().connections).toBe(1);
      expect(uploads).toBe(2);
      expect(saves).toBe(1);
    });
  }
