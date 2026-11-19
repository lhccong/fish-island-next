import { expect, test, type Page, type Route } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

async function openSettings(page: Page) {
  await page.getByRole('button', { name: '切换主题', exact: true }).click();
  await page.getByRole('button', { name: '网站设置', exact: true }).click();
  return page.getByRole('dialog', { name: '网站设置', exact: true });
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode} saves and restores the interface font size`, async ({
      page,
    }, info) => {
      await page.addInitScript(
        ({ skinId, colorMode }) => {
          localStorage.setItem('fish-island:skin', skinId);
          localStorage.setItem('fish-island:color-mode', colorMode);
        },
        { skinId: skin.id, colorMode: mode },
      );
      await page.route('https://**', (route) => route.abort());
      let background = 'success';
      let pendingHotList: Route | undefined;
      await page.route('**/api/hot/list', (route) => {
        if (background === 'loading') {
          pendingHotList = route;
          return;
        }
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
      await page.goto('/', { waitUntil: 'commit' });
      const title = page.locator('a[href="https://example.com/topic"]').first();
      await expect(title).toBeVisible();
      const readSize = () => title.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      const initialSize = await readSize();
      const dialog = await openSettings(page);
      const root = page.locator('html');
      const size = dialog.getByRole('combobox', { name: '界面字号' });
      const choices = page.getByRole('listbox', { name: '界面字号' });
      const save = dialog.getByRole('button', { name: '保存', exact: true });
      const viewport = dialog.getByRole('region', { name: '网站设置内容' });
      const close = dialog.getByRole('button', { name: '关闭网站设置' });
      const mobile = page.viewportSize()!.width <= 760;
      const openChoices = () => (mobile ? size.tap() : size.press('Enter'));
      const standardOption = choices.getByRole('option', { name: '标准（100%）' });
      const largeOption = choices.getByRole('option', { name: '特大（120%）' });
      await openChoices();
      await expect(standardOption).toHaveAttribute('data-state', 'checked');
      await page.keyboard.press('Escape');
      await expect(size).toBeFocused();
      await expect(dialog).toBeVisible();
      await openChoices();
      if (mobile) await largeOption.tap();
      else {
        await expect(standardOption).toBeFocused();
        await page.keyboard.press('End');
        await expect(largeOption).toBeFocused();
        await page.keyboard.press('Enter');
      }
      await expect(size).toHaveText('特大（120%）');
      await expect(root).toHaveCSS('font-size', '16px');
      await save.click();
      await expect(dialog.getByRole('status')).toHaveText('已保存到此浏览器');
      await expect(root).toHaveCSS('font-size', '19.2px');
      expect(await readSize()).toBeCloseTo(initialSize * 1.2);
      await expect(save).toHaveCSS('min-height', mobile ? '44px' : '32px');
      await page.screenshot({ path: info.outputPath('large-interface.png') });

      for (const state of ['empty', 'error', 'loading']) {
        background = state;
        await page.reload({ waitUntil: 'commit' });
        const feedback =
          state === 'empty'
            ? page.getByText('暂时没有热榜内容', { exact: true })
            : state === 'error'
              ? page.getByRole('button', { name: '重试', exact: true })
              : page.getByText('正在获取各平台热榜…', { exact: true });
        await expect(feedback).toBeVisible();
        await openSettings(page);
        await expect(root).toHaveCSS('font-size', '19.2px');
        await expect(size).toHaveText('特大（120%）');
        const layout = await viewport.evaluate((el) => {
          const fields = el.firstElementChild!.firstElementChild!;
          return {
            overflow: el.scrollWidth > el.clientWidth,
            gutter: el.getBoundingClientRect().right - fields.getBoundingClientRect().right,
          };
        });
        expect(layout.overflow).toBe(false);
        expect(layout.gutter).toBeGreaterThanOrEqual(mobile ? 20 : 24);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
      await page.setViewportSize({ width: page.viewportSize()!.width, height: 480 });
      await viewport.hover();
      if (mobile) {
        const box = (await viewport.boundingBox())!;
        const cdp = await page.context().newCDPSession(page);
        const x = Math.round(box.x + box.width / 2);
        const y = Math.round(box.y + box.height - 20);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let offset = 15; offset <= 120; offset += 15) {
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y - offset }],
          });
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await cdp.detach();
      } else await page.mouse.wheel(0, 400);
      await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      const scrollbar = dialog.locator('[data-orientation="vertical"]');
      await expect(scrollbar).toHaveCSS('visibility', mobile ? 'hidden' : 'visible');
      if (!mobile) await expect(scrollbar).toHaveCSS('opacity', '1');
      const lastField = dialog.getByRole('button', { name: '选择本地图片' });
      await lastField.focus();
      await expect(lastField).toBeInViewport();
      await dialog.getByRole('button', { name: '恢复默认' }).click();
      await expect(size).toHaveText('标准（100%）');
      await expect(root).toHaveCSS('font-size', '19.2px');
      await page.evaluate(() => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === 'fish-island:tab-identity') {
            Storage.prototype.setItem = original;
            throw new Error('synthetic quota failure');
          }
          original.call(this, key, value);
        };
      });
      await save.click();
      await expect(dialog.getByRole('alert')).toContainText('本地保存失败');
      await expect(root).toHaveCSS('font-size', '19.2px');
      await save.click();
      await expect(root).toHaveCSS('font-size', '16px');
      await close.click();
      await expect(page.getByRole('button', { name: '切换主题', exact: true })).toBeFocused();
      await pendingHotList?.abort();
    });
  }
