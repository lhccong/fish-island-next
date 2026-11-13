import { expect, test, type Route } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(60000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: defer images, reveal, retry and persist`, async ({ page }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('图片偏好合成草稿');
      const toggle = page.getByRole('switch', { name: '默认不渲染图片', exact: true });
      const open = async () => {
        await page.getByRole('button', { name: '群聊详情', exact: true }).click();
        await toggle.scrollIntoViewIfNeeded();
      };
      const close = () => page.getByRole('button', { name: '关闭在线列表' }).click();
      const activate = async () => {
        if (page.viewportSize()!.width <= 760) await toggle.tap();
        else {
          await toggle.focus();
          await page.keyboard.press('Space');
        }
      };
      await open();
      await expect(toggle).not.toBeChecked();
      await activate();
      await expect(toggle).toBeChecked();
      await expect(page.getByRole('switch', { name: '显示消息头像' })).toBeChecked();
      await page.screenshot({ path: info.outputPath('settings.png') });
      await close();
      let requests = 0;
      let held: Route | undefined;
      await page.route('https://defer.test/**', (route) => {
        requests++;
        if (requests > 2) {
          const wide = route.request().url().endsWith('/wide.png');
          const width = wide ? 640 : 120;
          const height = 240;
          return route.fulfill({
            contentType: 'image/svg+xml',
            body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#147a99"/></svg>`,
          });
        }
        held = route;
      });
      fixture.push('101', '图片前文[img]https://defer.test/one.png[/img]图片后文');
      const row = page.locator('[data-message-id="101"]');
      const reveal = row.getByRole('button', { name: '点击显示图片' });
      await expect(reveal).toBeVisible();
      await expect(row.getByRole('img', { name: '聊天图片', exact: true })).toHaveCount(0);
      expect(requests).toBe(0);
      await expect(row).toContainText('图片前文');
      await expect(row).toContainText('图片后文');
      await page.screenshot({ path: info.outputPath('deferred.png') });
      if (page.viewportSize()!.width <= 760) {
        expect((await reveal.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        await reveal.tap();
      } else {
        await reveal.focus();
        await page.keyboard.press('Enter');
      }
      await expect(row.getByText('图片加载中…')).toBeVisible();
      await expect.poll(() => requests).toBe(1);
      await held!.fulfill({ status: 404 });
      await expect(row.getByText('图片加载失败')).toBeVisible();
      await page.screenshot({ path: info.outputPath('error.png') });
      await row.getByRole('button', { name: '重新加载图片' }).click();
      await expect.poll(() => requests).toBe(2);
      await held!.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#147a99"/></svg>',
      });
      await expect(row.locator('[data-image-state]')).toHaveAttribute('data-image-state', 'ready');
      fixture.push('102', '[img]https://defer.test/two.png[/img]');
      const second = page.locator('[data-message-id="102"]');
      await expect(second.getByRole('button', { name: '点击显示图片' })).toBeVisible();
      expect(requests).toBe(2);
      await expect(draft).toHaveValue('图片偏好合成草稿');
      expect(fixture.stats().connections).toBe(1);
      expect(fixture.stats().historyRequests).toBe(1);
      await open();
      await activate();
      await close();
      await expect.poll(() => requests).toBeGreaterThan(2);
      await expect(second.getByRole('img', { name: '聊天图片', exact: true })).toHaveCount(1);
      await expect(second.locator('[data-image-state]')).toHaveAttribute(
        'data-image-state',
        'ready',
      );
      await expect(second.locator('[data-image-state]')).toHaveCSS(
        'background-color',
        'rgba(0, 0, 0, 0)',
      );
      await expect(second.locator('[data-image-state]')).toHaveCSS('border-top-width', '0px');
      await expect(second.locator('[data-image-only="true"]')).toHaveCSS(
        'background-color',
        'rgba(0, 0, 0, 0)',
      );
      await expect(second.locator('[data-image-only="true"]')).toHaveCSS('padding', '0px');
      await expect(second.getByRole('img', { name: '聊天图片', exact: true })).toHaveCSS(
        'object-position',
        '0% 50%',
      );
      const alignment = await second.evaluate((el) => {
        const meta = el.querySelector('time')!.parentElement!.getBoundingClientRect();
        const frame = el.querySelector('[data-image-state]')!.getBoundingClientRect();
        return Math.abs(frame.left - meta.left);
      });
      expect(alignment).toBeLessThanOrEqual(1);
      const portraitFrame = (await second.locator('[data-image-state]').boundingBox())!;
      expect(Math.abs(portraitFrame.width / portraitFrame.height - 0.5)).toBeLessThan(0.02);
      fixture.push('103', '[img]https://defer.test/self.png[/img]', true);
      const own = page.locator('[data-message-id="103"]');
      await expect(own.getByRole('img', { name: '聊天图片', exact: true })).toHaveCSS(
        'object-position',
        '100% 50%',
      );
      await expect(own.locator('[data-image-only="true"]')).toHaveCSS(
        'background-color',
        'rgba(0, 0, 0, 0)',
      );
      fixture.push('104', '[img]https://defer.test/wide.png[/img]');
      const wide = page.locator('[data-message-id="104"]');
      await expect(wide.locator('[data-image-state]')).toHaveAttribute('data-image-state', 'ready');
      const geometry = await wide.evaluate((el) => {
        const meta = el.querySelector('time')!.parentElement!.getBoundingClientRect();
        const frame = el.querySelector('[data-image-state]')!.getBoundingClientRect();
        const image = el.querySelector<HTMLImageElement>('img[alt="聊天图片"]')!;
        const rect = image.getBoundingClientRect();
        return {
          gap: frame.top - meta.bottom,
          alignment: Math.abs(meta.left - frame.left),
          ratio: frame.width / frame.height,
          imageRatio: image.naturalWidth / image.naturalHeight,
          frameHeight: frame.height,
          imageHeight: rect.height,
        };
      });
      expect(geometry.gap).toBeGreaterThanOrEqual(0);
      expect(geometry.gap).toBeLessThanOrEqual(10);
      expect(geometry.alignment).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.ratio - geometry.imageRatio)).toBeLessThan(0.02);
      expect(Math.abs(geometry.frameHeight - geometry.imageHeight)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: info.outputPath('transparent-image.png') });
      await open();
      await activate();
      await close();
      await expect(row.getByRole('button', { name: '点击显示图片' })).toBeVisible();
      await expect(second.getByRole('button', { name: '点击显示图片' })).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('fish-island:chat:defer-images'))).toBe(
        'true',
      );
      const overflow = await page
        .locator('[data-message-id], [aria-label="群聊消息区"]')
        .evaluateAll((els) => els.some((el) => el.scrollWidth > el.clientWidth + 1));
      expect(overflow).toBe(false);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const viewport = page.viewportSize()!;
      if (viewport.width <= 760) await page.setViewportSize({ width: 1280, height: 900 });
      const beforeSwitch = requests;
      await page.getByRole('button', { name: '切换主题', exact: true }).click();
      const picker = page.getByRole('dialog', { name: '主题模式' });
      await picker
        .getByRole('button', { name: mode === 'light' ? '暗夜模式' : '明亮模式', exact: true })
        .click();
      const other = builtinSkins.find((item) => item.id !== skin.id)!;
      await picker.getByRole('button', { name: other.name, exact: true }).click();
      await picker.getByRole('button', { name: '关闭主题弹窗' }).click();
      await page.setViewportSize(viewport);
      await expect(second.getByRole('button', { name: '点击显示图片' })).toBeVisible();
      await expect(draft).toHaveValue('图片偏好合成草稿');
      expect(fixture.stats().connections).toBe(1);
      expect(fixture.stats().historyRequests).toBe(1);
      expect(requests).toBe(beforeSwitch);
      await page.reload();
      await open();
      await expect(toggle).toBeChecked();
      // A denied storage write must keep the current page usable and disclose persistence failure.
      await page.evaluate(() => {
        Storage.prototype.setItem = () => {
          throw new Error('synthetic storage denied');
        };
      });
      await activate();
      await expect(toggle).not.toBeChecked();
      await expect(page.getByText('图片偏好未能保存，当前页面已生效')).toBeVisible();
    });
  }
