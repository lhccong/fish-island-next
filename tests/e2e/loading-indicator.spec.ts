import { expect, test, type Route } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

for (const skin of builtinSkins) {
  for (const mode of ['light', 'dark']) {
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: centered loading, recovery and close`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        const fixture = await setupChatMenu(page, skin.id, mode);
        const draft = page.getByRole('textbox', { name: '消息草稿' });
        await draft.fill('保留合成草稿');
        let held: Route | undefined;
        let requests = 0;
        await page.route('**/api/emoticon_favour/list/page', (route) => {
          requests++;
          held = route;
        });
        // Hold the lazy chunk to verify the exact fallback shown in the reported defect.
        let release!: () => void;
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        page.on('close', () => release());
        await page.route('**/EmoticonPicker.tsx*', async (route) => {
          await gate;
          await route.continue();
        });
        const trigger = page.getByRole('button', { name: '表情包', exact: true });
        await trigger.click();
        const panel = page.getByRole('dialog', { name: '表情包', exact: true });
        const fallback = panel.locator('[data-loading-indicator="region"]');
        await expect(fallback).toContainText('正在加载表情包面板');
        await expect(fallback.locator('svg')).toBeVisible();
        await expect
          .poll(() =>
            fallback.evaluate((el) => {
              const outer = el.closest('[role="dialog"]')!.getBoundingClientRect();
              const inner = el.getBoundingClientRect();
              return Math.abs(inner.x + inner.width / 2 - outer.x - outer.width / 2);
            }),
          )
          .toBeLessThan(3);
        await expect
          .poll(() =>
            fallback.evaluate((el) => {
              const outer = el.closest('[role="dialog"]')!.getBoundingClientRect();
              const inner = el.getBoundingClientRect();
              return Math.abs(inner.y + inner.height / 2 - outer.y - (outer.height + 44) / 2);
            }),
          )
          .toBeLessThan(4);
        await page.screenshot({ path: `.tmp-loading-20261115/${skin.id}-${mode}-${width}.png` });
        release();
        await page.getByRole('button', { name: '我的收藏', exact: true }).click();
        const loading = panel.locator('[data-loading-indicator="region"]');
        await expect(loading).toContainText('正在加载表情包');
        await expect(loading.locator('svg')).toBeVisible();
        const region = panel.getByRole('region', { name: '表情包列表' });
        const geometry = await region.boundingBox();
        const inner = await loading.boundingBox();
        expect(
          Math.abs(inner!.y + inner!.height / 2 - geometry!.y - geometry!.height / 2),
        ).toBeLessThan(4);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect(loading.locator('svg')).toHaveCSS('animation-name', 'none');
        expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await expect.poll(() => !!held).toBe(true);
        const initialRequests = requests;
        await held!.fulfill({ json: { code: 50001, message: '合成加载失败，请重试' } });
        held = undefined;
        await expect(panel.getByText('合成加载失败，请重试')).toBeVisible();
        await expect(panel.locator('[data-loading-indicator]')).toHaveCount(0);
        await panel.getByRole('button', { name: '重试表情包', exact: true }).click();
        await expect.poll(() => !!held).toBe(true);
        await held!.fulfill({ json: { code: 0, data: { records: [], total: 0 } } });
        held = undefined;
        await expect(panel.getByText(/还没有收藏/)).toBeVisible();
        await expect(panel.locator('[data-loading-indicator]')).toHaveCount(0);
        await panel.getByRole('button', { name: '关闭表情包' }).click();
        await expect(panel).not.toBeVisible();
        await expect(trigger).toBeFocused();
        await expect(draft).toHaveText('保留合成草稿');
        expect(requests).toBe(initialRequests + 1);
        expect(fixture.stats().connections).toBe(1);
      });
    }
  }
}

for (const skin of builtinSkins) {
  for (const mode of ['light', 'dark']) {
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: hot board loading and recovery`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript(
          ({ skin, mode }) => {
            localStorage.setItem('fish-island:skin', skin);
            localStorage.setItem('fish-island:color-mode', mode);
          },
          { skin: skin.id, mode },
        );
        await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
        let held: Route | undefined;
        await page.route('**/api/hot/list', (route) => {
          held = route;
        });
        await page.goto('/');
        const loading = page
          .getByRole('main')
          .locator('[data-loading-indicator="region"]')
          .filter({ hasText: '正在获取各平台热榜' });
        await expect(loading).toBeVisible();
        await expect(loading.locator('svg')).toBeVisible();
        await expect(loading.locator('svg')).toHaveCSS('animation-name', 'none');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await expect.poll(() => !!held).toBe(true);
        await held!.fulfill({ status: 503, body: '' });
        held = undefined;
        await expect(page.getByRole('alert')).toContainText('503');
        await expect(loading).toHaveCount(0);
        await page.getByRole('button', { name: '重试', exact: true }).click();
        await expect.poll(() => !!held).toBe(true);
        await held!.fulfill({ json: { code: 0, data: [] } });
        held = undefined;
        await expect(page.getByText('暂时没有热榜内容')).toBeVisible();
        await expect(loading).toHaveCount(0);
        await page.getByRole('button', { name: '刷新热榜', exact: true }).click();
        await expect.poll(() => !!held).toBe(true);
        await held!.fulfill({
          json: {
            code: 0,
            data: [
              {
                id: 'test',
                name: '合成来源',
                categoryName: '社区',
                data: [{ title: '合成热榜条目', url: 'https://example.com/loading-test' }],
              },
            ],
          },
        });
        await expect(
          page.getByRole('main').getByRole('link', { name: '合成热榜条目', exact: true }),
        ).toBeVisible();
        await expect(loading).toHaveCount(0);
      });
    }
  }
}

for (const width of [375, 390]) {
  test.describe(`touch ${width}`, () => {
    test.use({ hasTouch: true, isMobile: true, viewport: { width, height: 844 } });
    for (const skin of builtinSkins) {
      for (const mode of ['light', 'dark']) {
        test(`${skin.id} ${mode}: loading panel touch flow`, async ({ page }) => {
          const fixture = await setupChatMenu(page, skin.id, mode);
          let held: Route | undefined;
          await page.route('**/api/emoticon_favour/list/page', (route) => {
            held = route;
          });
          const trigger = page.getByRole('button', { name: '表情包', exact: true });
          await trigger.tap();
          const panel = page.getByRole('dialog', { name: '表情包', exact: true });
          await panel.getByRole('button', { name: '我的收藏', exact: true }).tap();
          await expect(panel.locator('[data-loading-indicator="region"] svg')).toBeVisible();
          await expect.poll(() => !!held).toBe(true);
          await held!.fulfill({ json: { code: 0, data: { records: [], total: 0 } } });
          await expect(panel.getByText(/还没有收藏/)).toBeVisible();
          await panel.getByRole('button', { name: '关闭表情包' }).tap();
          await expect(panel).not.toBeVisible();
          expect(fixture.stats().connections).toBe(1);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
        });
      }
    }
  });
}
