import { expect, test, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { verifyDocking } from './work-time-docking';

test.use({ timezoneId: 'Asia/Shanghai' });

async function setup(page: Page, skin: string, mode: string) {
  await page.addInitScript(
    ({ skin, mode }) => {
      localStorage.setItem('fish-island:skin', skin);
      localStorage.setItem('fish-island:color-mode', mode);
      localStorage.setItem('moneyButtonVisibility', 'true');
      if (!sessionStorage.getItem('holiday-test-init')) {
        sessionStorage.setItem('holiday-test-init', 'true');
        localStorage.setItem('fish-island:work-time-position', '{"x":1,"y":0.7}');
      }
      sessionStorage.setItem(
        'fish-island-next.session:https%3A%2F%2Fapi.yucoder.cn',
        JSON.stringify({ tokenName: 'synthetic-session', tokenValue: 'synthetic' }),
      );
    },
    { skin, mode },
  );
  await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
  await page.route('**/api/user/get/login', (route) =>
    route.fulfill({
      json: { code: 0, data: { id: 'synthetic-holiday', userName: '合成用户', userRole: 'user' } },
    }),
  );
  await page.routeWebSocket(/\/ws\//, (socket) => socket.onMessage(() => {}));
  await page.clock.install();
  await page.clock.setFixedTime(new Date('2026-12-31T23:59:58+08:00'));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-skin', skin);
}

for (const width of [1280, 375, 390]) {
  test.describe(`${width}px 节假日`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: width < 760, hasTouch: width < 760 });
    for (const skin of builtinSkins)
      for (const mode of ['light', 'dark']) {
        test(`${skin.id} ${mode} 预览与原设置`, async ({ page }, info) => {
          await setup(page, skin.id, mode);
          const orb = page.getByRole('button', { name: '工作时间设置' });
          const tooltip = page.getByRole('tooltip', { name: '节假日倒计时' });
          const dialog = page.getByRole('dialog', { name: '工作时间', exact: true });
          await expect(orb).toBeVisible();
          if (width > 760) {
            await orb.hover();
            await expect(tooltip).toContainText('元旦');
            await expect(tooltip).toContainText('还有 00:00:02');
            const box = (await tooltip.boundingBox())!;
            expect(box.x).toBeGreaterThanOrEqual(12);
            expect(box.x + box.width).toBeLessThanOrEqual(width - 12);
            expect(box.y + box.height).toBeLessThanOrEqual(844 - 12);
            await tooltip.hover();
            await page.waitForTimeout(2700);
            await expect(tooltip).toBeVisible();
            await page.screenshot({ path: info.outputPath('holiday-hover.png') });
            await page.keyboard.press('Escape');
            await expect(tooltip).toHaveCount(0);
            await page.mouse.move(20, 20);
            await orb.focus();
            await expect(tooltip).toBeVisible();
            await page.keyboard.press('Escape');
            await orb.press('Home');
            await orb.evaluate((element) => element.blur());
            await orb.hover();
            await expect(tooltip).toBeVisible();
            expect((await tooltip.boundingBox())!.x).toBeGreaterThan(80);
            const before = (await orb.boundingBox())!;
            await page.mouse.move(before.x + 40, before.y + 40);
            await page.mouse.down();
            await page.mouse.move(before.x + 160, before.y - 60, { steps: 5 });
            await expect(tooltip).toHaveCount(0);
            await page.mouse.up();
            await expect(dialog).toHaveCount(0);
            await orb.click();
          } else {
            await orb.tap();
            if (!(await dialog.isVisible())) await orb.tap();
            await expect(tooltip).toHaveCount(0);
          }
          await expect(dialog).toBeVisible();
          const summary = dialog.getByRole('region', { name: '节假日倒计时' });
          await expect(summary).toContainText('2027年01月01日 至 01月03日 · 3天');
          await expect(summary).toContainText('还有 00:00:02');
          await page.screenshot({ path: info.outputPath('holiday-dialog.png') });
          await page.clock.setFixedTime(new Date('2027-01-03T23:59:59+08:00'));
          await expect(summary).toContainText('假期进行中');
          await page.clock.setFixedTime(new Date('2027-01-04T00:00:00+08:00'));
          await expect(summary).toContainText('春节');
          await expect(summary).toContainText('还有 32 天');
          await page.clock.setFixedTime(new Date('2027-10-08T00:00:00+08:00'));
          await expect(summary).toContainText('等待更新放假安排');
          const viewport = page.getByRole('region', { name: '工作时间内容', exact: true });
          expect(
            await viewport.evaluate((el) => el.scrollWidth - el.clientWidth),
          ).toBeLessThanOrEqual(1);
          if (width < 760) {
            const box = (await viewport.boundingBox())!;
            const cdp = await page.context().newCDPSession(page);
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchStart',
              touchPoints: [{ x: box.x + 30, y: box.y + box.height - 30 }],
            });
            for (let step = 1; step <= 6; step++)
              await cdp.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ x: box.x + 30, y: box.y + box.height - 30 - step * 30 }],
              });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
            await cdp.detach();
          }
          await page.getByLabel('下班时间', { exact: true }).fill('08:00');
          let appearanceRequests = 0;
          let appearanceConnections = 0;
          const countRequest = (request: { url: () => string }) => {
            if (request.url().includes('/api/')) appearanceRequests++;
          };
          const countConnection = () => appearanceConnections++;
          page.on('request', countRequest);
          page.on('websocket', countConnection);
          await page.evaluate(async () => {
            const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
            const store = useAppearanceStore.getState();
            store.setSkinId(store.skinId === 'wps' ? 'wechat' : 'wps');
            store.setColorMode(store.colorMode === 'light' ? 'dark' : 'light');
          });
          await expect(page.locator('html')).toHaveAttribute(
            'data-skin',
            skin.id === 'wps' ? 'wechat' : 'wps',
          );
          await expect(page.getByLabel('下班时间', { exact: true })).toHaveValue('08:00');
          await page.evaluate(
            async ({ skin, mode }) => {
              const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
              useAppearanceStore.getState().setSkinId(skin);
              useAppearanceStore.getState().setColorMode(mode);
            },
            { skin: skin.id, mode },
          );
          await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
          await expect(page.getByLabel('下班时间', { exact: true })).toHaveValue('08:00');
          expect(appearanceRequests).toBe(0);
          expect(appearanceConnections).toBe(0);
          page.off('request', countRequest);
          page.off('websocket', countConnection);
          await dialog.getByRole('button', { name: '保存', exact: true }).click();
          await expect(dialog.getByRole('alert')).toContainText('请检查时间顺序');
          await page.getByLabel('下班时间', { exact: true }).fill('18:00');
          await dialog.getByRole('button', { name: '保存', exact: true }).click();
          await expect(dialog.getByRole('status')).toContainText('已保存到此浏览器');
          await page.getByRole('button', { name: '关闭工作时间', exact: true }).click();
          await expect(dialog).toHaveCount(0);
          await expect(orb).toBeFocused();
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
          ).toBeLessThanOrEqual(1);
          await verifyDocking(page, width);
        });
      }
  });
}
