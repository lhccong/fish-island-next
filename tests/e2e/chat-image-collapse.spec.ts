import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: collapse deferred images in every loading state`, async ({
      page,
    }, info) => {
      await page.addInitScript(() => {
        localStorage.setItem('fish-island:chat:defer-images', 'true');
      });
      const fixture = await setupChatMenu(page, skin.id, mode);
      let requests = 0;
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('https://collapse.test/image.svg', async (route) => {
        requests++;
        await gate;
        return route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#147a99"/></svg>',
        });
      });
      const mobile = page.viewportSize()!.width <= 760;
      const row = page.locator('[data-message-id="101"]');
      const toggle = row.getByRole('button', { name: /^(点击显示图片|收起图片)$/ });
      const activate = async () => {
        if (mobile) await toggle.tap();
        else {
          await toggle.focus();
          await page.keyboard.press('Enter');
        }
      };
      const verifyCollapsed = async () => {
        await expect(toggle).toHaveText('点击显示图片');
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(toggle).toBeFocused();
        await expect(row.locator('[data-image-state]')).toHaveCount(0);
      };
      try {
        fixture.push('101', '图片前文[img]https://collapse.test/image.svg[/img]图片后文');
        fixture.push('102', '[img]https://collapse.test/image.svg[/img]');
        const draft = page.getByRole('textbox', { name: '消息草稿' });
        await draft.fill('收起图片保留草稿');
        const before = fixture.stats();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(requests).toBe(0);
        await activate();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(row.getByText('图片加载中…')).toBeVisible();
        await expect.poll(() => requests).toBe(1);
        await page.screenshot({ path: info.outputPath('loading.png') });
        await activate();
        await verifyCollapsed();
        release();

        await activate();
        await expect(row.locator('[data-image-state]')).toHaveAttribute(
          'data-image-state',
          'ready',
        );
        await row.getByRole('img', { name: '聊天图片', exact: true }).dispatchEvent('error');
        await expect(row.getByText('图片加载失败', { exact: true })).toBeVisible();
        await page.screenshot({ path: info.outputPath('error.png') });
        await activate();
        await verifyCollapsed();

        await activate();
        await expect(row.locator('[data-image-state]')).toHaveAttribute(
          'data-image-state',
          'ready',
        );
        const box = (await toggle.boundingBox())!;
        const frame = (await row.locator('[data-image-state]').boundingBox())!;
        expect(box.height).toBe(44);
        expect(box.width).toBe(44);
        expect(Math.abs(box.y - frame.y)).toBeLessThanOrEqual(1);
        expect(Math.abs(box.x + box.width - frame.x - frame.width)).toBeLessThanOrEqual(1);
        await expect(toggle).toHaveText('');
        await expect(toggle.locator('svg')).toBeVisible();
        await toggle.focus();
        await page.screenshot({ path: info.outputPath('ready.png') });
        await row.getByRole('button', { name: '放大聊天图片' }).click();
        const preview = page.getByRole('dialog', { name: '图片预览', exact: true });
        await preview.getByRole('button', { name: '关闭图片预览' }).click();
        await expect(preview).toBeHidden();
        const beforeCollapse = requests;
        await activate();
        await verifyCollapsed();
        await page.screenshot({ path: info.outputPath('collapsed.png') });
        expect(requests).toBe(beforeCollapse);
        await expect(row).toContainText('图片前文');
        await expect(row).toContainText('图片后文');
        await expect(
          page.locator('[data-message-id="102"]').getByRole('button', { name: '点击显示图片' }),
        ).toHaveAttribute('aria-expanded', 'false');
        await expect(draft).toHaveText('收起图片保留草稿');
        expect(fixture.stats()).toEqual(before);
        expect(
          await page.evaluate(() => localStorage.getItem('fish-island:chat:defer-images')),
        ).toBe('true');
        expect(
          await page
            .locator('[data-message-id]')
            .evaluateAll((rows) => rows.every((el) => el.scrollWidth <= el.clientWidth + 1)),
        ).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      } finally {
        release();
      }
    });
  }
