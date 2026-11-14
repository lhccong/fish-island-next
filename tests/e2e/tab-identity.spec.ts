import { expect, test, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=',
  'base64',
);
async function openSettings(page: Page) {
  await page.getByRole('button', { name: '切换主题', exact: true }).click();
  await page.getByRole('button', { name: '网站设置', exact: true }).click();
  return page.getByRole('dialog', { name: '网站设置', exact: true });
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode} local tab settings and all background states`, async ({
      page,
    }, info) => {
      test.setTimeout(90000);
      await page.addInitScript(
        ({ skinId, colorMode }) => {
          if (!localStorage.getItem('fish-island:skin'))
            localStorage.setItem('fish-island:skin', skinId);
          if (!localStorage.getItem('fish-island:color-mode'))
            localStorage.setItem('fish-island:color-mode', colorMode);
        },
        { skinId: skin.id, colorMode: mode },
      );
      let background = 'success';
      await page.route('**/api/hot/list', (route) => {
        if (background === 'loading') return;
        if (background === 'error') return route.fulfill({ status: 500, body: 'unavailable' });
        return route.fulfill({
          json: {
            code: 0,
            data:
              background === 'empty'
                ? []
                : [
                    {
                      id: '1',
                      name: '知乎热榜',
                      categoryName: '综合资讯',
                      data: [{ title: '合成测试内容', url: 'https://example.com/topic' }],
                    },
                  ],
          },
        });
      });
      await page.route('https://example.com/**', (route) =>
        route.fulfill({ status: 404, body: '' }),
      );
      await page.goto('/');
      let dialog = await openSettings(page);
      await dialog.getByRole('textbox', { name: '网站名称', exact: true }).fill('  项目文档  ');
      await dialog
        .locator('input[type=file]')
        .setInputFiles({ name: 'icon.png', mimeType: 'image/png', buffer: png });
      await expect(dialog.getByRole('button', { name: '保存', exact: true })).toBeEnabled();
      await dialog.getByRole('button', { name: '保存', exact: true }).click();
      await expect(dialog.getByRole('status')).toHaveText('已保存到此浏览器');
      await expect(page).toHaveTitle('项目文档');
      await expect(page.locator('head link[rel="icon"]')).toHaveAttribute(
        'href',
        /^data:image\/png;base64,/,
      );
      await page.screenshot({ path: info.outputPath(`${skin.id}-${mode}-saved.png`) });
      await page.reload();
      await expect(page).toHaveTitle('项目文档');
      dialog = await openSettings(page);
      await expect(dialog.getByRole('textbox', { name: '网站名称', exact: true })).toHaveValue(
        '项目文档',
      );
      await dialog
        .getByRole('textbox', { name: '图标地址', exact: true })
        .fill('https://example.com/missing.png');
      await dialog.getByRole('button', { name: '保存', exact: true }).click();
      await expect(dialog.getByRole('alert')).toContainText('图标无法加载');
      await expect(page).toHaveTitle('项目文档');
      // A failed local write keeps the form and the previously applied identity intact.
      await dialog.getByRole('button', { name: '恢复默认', exact: true }).click();
      await page.evaluate(() => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === 'fish-island:tab-identity') throw new Error('quota');
          original.call(this, key, value);
        };
      });
      await dialog.getByRole('button', { name: '保存', exact: true }).click();
      await expect(dialog.getByRole('alert')).toContainText('本地保存失败');
      await expect(page).toHaveTitle('项目文档');
      await page.reload();
      dialog = await openSettings(page);
      await dialog.getByRole('button', { name: '恢复默认', exact: true }).click();
      await dialog.getByRole('button', { name: '保存', exact: true }).click();
      await expect(page).toHaveTitle('摸鱼岛');
      await expect(page.locator('head link[rel="icon"]')).toHaveAttribute(
        'href',
        '/favicon.ico?v=moyudao',
      );
      await dialog.getByRole('textbox', { name: '网站名称', exact: true }).fill('未保存的修改');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: '切换主题', exact: true })).toBeFocused();
      dialog = await openSettings(page);
      await expect(dialog.getByRole('textbox', { name: '网站名称', exact: true })).toHaveValue(
        '摸鱼岛',
      );
      for (const state of ['empty', 'error', 'loading']) {
        background = state;
        await page.reload();
        dialog = await openSettings(page);
        await expect(dialog).toBeVisible();
        await dialog.getByRole('textbox', { name: '网站名称', exact: true }).fill('窄屏与主题验证');
        const layout = await dialog.evaluate((el) => {
          const viewport = el.querySelector('[data-radix-scroll-area-viewport]')!;
          const fields = viewport.firstElementChild!.firstElementChild!;
          return {
            overflow: el.scrollWidth > el.clientWidth,
            gutter: viewport.getBoundingClientRect().right - fields.getBoundingClientRect().right,
            width: el.getBoundingClientRect().width,
            right: el.getBoundingClientRect().right,
          };
        });
        expect(layout.overflow).toBe(false);
        expect(layout.gutter).toBeGreaterThanOrEqual(page.viewportSize()!.width <= 760 ? 20 : 24);
        expect(layout.right).toBeLessThanOrEqual(page.viewportSize()!.width);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: '切换主题', exact: true })).toBeFocused();
      }
      // Short viewport represents the space remaining above a mobile soft keyboard.
      dialog = await openSettings(page);
      await page.setViewportSize({ width: page.viewportSize()!.width, height: 480 });
      const viewport = dialog.getByRole('region', { name: '网站设置内容' });
      await page.screenshot({ path: info.outputPath('before-scroll.png') });
      await viewport.hover();
      if (info.project.name.startsWith('mobile')) {
        const box = (await viewport.boundingBox())!;
        const cdp = await page.context().newCDPSession(page);
        const x = Math.round(box.x + box.width / 2);
        const y = Math.round(box.y + box.height - 20);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let step = 1; step <= 10; step++) {
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y - step * 15 }],
          });
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await cdp.detach();
      } else await page.mouse.wheel(0, 400);
      await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      const scrollbar = dialog.locator('[data-orientation="vertical"]');
      if (info.project.name.startsWith('mobile'))
        await expect(scrollbar).toHaveCSS('visibility', 'hidden');
      else await expect(scrollbar).toBeVisible();
      await dialog.getByRole('button', { name: '选择本地图片', exact: true }).focus();
      await expect(
        dialog.getByRole('button', { name: '选择本地图片', exact: true }),
      ).toBeInViewport();
      await page.screenshot({ path: info.outputPath(`${skin.id}-${mode}-scroll.png`) });
      await dialog.getByRole('button', { name: '关闭网站设置', exact: true }).click();
      await expect(page.getByRole('button', { name: '切换主题', exact: true })).toBeFocused();
    });
  }

test('online icon loading, saving and cancellation', async ({ page }) => {
  let releaseImage!: () => void;
  let gate = new Promise<void>((resolve) => {
    releaseImage = resolve;
  });
  await page.route('**/api/hot/list', (route) => route.fulfill({ json: { code: 0, data: [] } }));
  await page.route('https://example.com/*.png', async (route) => {
    await gate;
    await route.fulfill({ contentType: 'image/png', body: png });
  });
  await page.goto('/');
  let dialog = await openSettings(page);
  await dialog.getByRole('textbox', { name: '网站名称', exact: true }).fill('在线图标');
  await dialog
    .getByRole('textbox', { name: '图标地址', exact: true })
    .fill('https://example.com/icon.png');
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('正在处理图标…');
  await expect(dialog.getByRole('button', { name: '保存', exact: true })).toBeDisabled();
  releaseImage();
  await expect(dialog.getByRole('status')).toHaveText('已保存到此浏览器');
  await expect(page.locator('head link[rel="icon"]')).toHaveAttribute(
    'href',
    'https://example.com/icon.png',
  );
  gate = new Promise<void>((resolve) => {
    releaseImage = resolve;
  });
  await dialog.getByRole('textbox', { name: '网站名称', exact: true }).fill('取消的修改');
  await dialog
    .getByRole('textbox', { name: '图标地址', exact: true })
    .fill('https://example.com/other.png');
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('正在处理图标…');
  await dialog.getByRole('button', { name: '关闭网站设置', exact: true }).click();
  releaseImage();
  await expect(page).toHaveTitle('在线图标');
  dialog = await openSettings(page);
  await expect(dialog.getByRole('textbox', { name: '网站名称', exact: true })).toHaveValue(
    '在线图标',
  );
});
