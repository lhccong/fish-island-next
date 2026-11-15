import { expect, test, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { verifyDocking } from './work-time-docking';

test.use({ timezoneId: 'Asia/Shanghai' });

async function setup(page: Page, skin: string, mode: string) {
  await page.addInitScript(
    ({ skin, mode }) => {
      localStorage.setItem('fish-island:skin', skin);
      localStorage.setItem('fish-island:color-mode', mode);
      if (!sessionStorage.getItem('work-test-init')) {
        sessionStorage.setItem('work-test-init', 'true');
        localStorage.removeItem('fish-island:work-time-position');
        localStorage.setItem('moneyButtonVisibility', 'true');
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
      json: {
        code: 0,
        data: {
          id: 'synthetic-work',
          userName: '合成测试用户',
          userRole: 'user',
        },
      },
    }),
  );
  await page.routeWebSocket(/\/ws\//, (socket) => socket.onMessage(() => {}));
  await page.clock.install({ time: new Date('2026-11-16T10:00:00+08:00') });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-skin', skin);
  await expect(page.getByRole('button', { name: '工作时间设置' })).toBeVisible();
}

for (const width of [1280, 375, 390]) {
  test.describe(`${width}px 工作时间`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: width < 760, hasTouch: width < 760 });
    for (const skin of builtinSkins)
      for (const mode of ['light', 'dark']) {
        test(`${skin.id} ${mode} 拖动与设置`, async ({ page }, info) => {
          await setup(page, skin.id, mode);
          const orb = page.getByRole('button', { name: '工作时间设置' });
          await orb.focus();
          for (const [time, label, icon] of [
            ['2026-11-16T07:00:00+08:00', '距上班', 'start'],
            ['2026-11-16T10:00:00+08:00', '距午饭', 'lunch'],
            ['2026-11-16T14:00:00+08:00', '距下班', 'end'],
            ['2026-11-16T20:00:00+08:00', '已下班', 'done'],
            ['2026-11-22T10:00:00+08:00', '今天休息', 'rest'],
          ]) {
            await page.clock.setSystemTime(new Date(time!));
            await page.clock.runFor(1000);
            await expect(orb).toContainText(label!);
            await expect(orb.locator('[data-work-icon]')).toHaveAttribute('data-work-icon', icon!);
            expect(
              await orb.evaluate(
                (el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight,
              ),
            ).toBe(true);
            if (['wechat', 'pixel-island'].includes(skin.id)) {
              await orb.screenshot({ path: info.outputPath(`pixel-${icon}.png`) });
            }
          }
          await page.clock.setSystemTime(new Date('2026-11-16T10:00:00+08:00'));
          await page.clock.runFor(1000);
          await orb.evaluate((el) => el.blur());
          const original = (await orb.boundingBox())!;
          const from = { x: original.x + 40, y: original.y + 40 };
          const to = { x: from.x - 120, y: from.y - 160 };
          if (width < 760) {
            const cdp = await page.context().newCDPSession(page);
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [to] });
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await cdp.detach();
          } else {
            await page.mouse.move(from.x, from.y);
            await page.mouse.down();
            await page.mouse.move(to.x, to.y, { steps: 8 });
            await page.mouse.up();
          }
          await expect(page.getByRole('dialog')).toHaveCount(0);
          const moved = (await orb.boundingBox())!;
          expect(moved.x).toBeLessThan(original.x - 80);
          expect(moved.y).toBeLessThan(original.y - 100);
          await page.reload({ waitUntil: 'domcontentloaded' });
          await expect(orb).toBeVisible();
          expect(Math.abs((await orb.boundingBox())!.x - moved.x)).toBeLessThan(2);
          await orb.focus();
          await page.keyboard.press('ArrowLeft');
          await expect
            .poll(async () => (await orb.boundingBox())?.x ?? Infinity)
            .toBeLessThan(moved.x);
          await page.keyboard.press('Enter');
          const dialog = page.getByRole('dialog', { name: '工作时间', exact: true });
          await expect(dialog).toBeVisible();
          await expect(dialog.getByLabel('今日工作概览')).toContainText('上班');
          await page.getByLabel('上班时间', { exact: true }).fill('23:00');
          await page.getByRole('button', { name: '保存', exact: true }).click();
          await expect(page.getByRole('alert')).toContainText('请检查');
          await page.getByLabel('上班时间', { exact: true }).fill('09:00');
          await page.getByLabel('月薪（元，可不填）').fill('22000');
          await page.getByLabel('工作制', { exact: true }).click();
          await page.getByRole('option', { name: '大小周' }).click();
          await expect(page.getByLabel('本周类型', { exact: true })).toBeVisible();
          await page.evaluate(() => {
            const original = Storage.prototype.setItem;
            Storage.prototype.setItem = function (key, value) {
              if (key === 'fish-island:work-schedule') {
                Storage.prototype.setItem = original;
                throw new Error('合成存储失败，请重试');
              }
              original.call(this, key, value);
            };
          });
          await page.getByRole('button', { name: '保存', exact: true }).click();
          await expect(page.getByRole('alert')).toContainText('合成存储失败');
          await page.getByRole('button', { name: '保存', exact: true }).click();
          await expect(page.getByRole('status')).toHaveText('已保存到此浏览器');
          await expect(dialog.getByLabel('今日工作概览')).toContainText('今日收入估算');
          const viewport = page.getByRole('region', { name: '工作时间内容', exact: true });
          const geometry = await viewport.evaluate((el) => {
            const box = el.getBoundingClientRect();
            const input = el.querySelector('input')!.getBoundingClientRect();
            return {
              overflow: el.scrollWidth - el.clientWidth,
              gutter: box.right - input.right,
              padding: getComputedStyle(el).paddingRight,
            };
          });
          expect(geometry.overflow).toBeLessThanOrEqual(1);
          expect(parseFloat(geometry.padding)).toBeGreaterThanOrEqual(width < 760 ? 20 : 24);
          await viewport.hover();
          if (width < 760) {
            await viewport.evaluate((el) => {
              el.scrollTop = 0;
            });
            const bounds = (await viewport.boundingBox())!;
            const cdp = await page.context().newCDPSession(page);
            const point = { x: bounds.x + bounds.width - 10, y: bounds.y + bounds.height - 40 };
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchStart',
              touchPoints: [point],
            });
            for (let step = 1; step <= 6; step++) {
              await cdp.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ x: point.x, y: point.y - step * 25 }],
              });
            }
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
            await cdp.detach();
          } else {
            await page.mouse.wheel(0, 500);
          }
          await viewport.evaluate((el) => {
            el.scrollTop = el.scrollHeight;
          });
          await page.getByLabel('本周类型', { exact: true }).focus();
          await expect(page.getByLabel('本周类型', { exact: true })).toBeInViewport();
          await page.keyboard.press('Escape');
          await expect(dialog).toHaveCount(0);
          await expect(orb).toBeFocused();
          const pos = (await orb.boundingBox())!;
          expect(pos.x).toBeGreaterThanOrEqual(12);
          expect(pos.x + pos.width).toBeLessThanOrEqual(width - 12);
          expect(pos.y + pos.height).toBeLessThanOrEqual(width < 760 ? 764 : 820);
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
          ).toBeLessThanOrEqual(1);
          await page.getByRole('button', { name: '用户菜单', exact: true }).click();
          await page
            .getByRole('menuitem', { name: mode === 'dark' ? '切换明亮模式' : '切换深色模式' })
            .click();
          expect(Math.abs((await orb.boundingBox())!.x - pos.x)).toBeLessThan(1);
          await orb.click();
          await expect(page.getByLabel('上班时间', { exact: true })).toHaveValue('09:00');
          if (['wechat', 'pixel-island'].includes(skin.id)) {
            await page.screenshot({ path: info.outputPath('work-time.png') });
            await page.getByRole('button', { name: '关闭工作时间' }).click();
            await page.screenshot({ path: info.outputPath('work-orb.png') });
          }
          await verifyDocking(
            page,
            width,
            ['wechat', 'pixel-island'].includes(skin.id) ? info : undefined,
          );
        });
      }
  });
}

test('阶段状态、保存失败与视口边界', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page, 'wechat', 'light');
  const orb = page.getByRole('button', { name: '工作时间设置' });
  expect(
    await orb.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration)),
  ).toBeLessThanOrEqual(0.001);
  await orb.focus();
  for (const [time, label] of [
    ['2026-11-16T07:00:00+08:00', '距上班'],
    ['2026-11-16T10:00:00+08:00', '距午饭'],
    ['2026-11-16T14:00:00+08:00', '距下班'],
    ['2026-11-16T20:00:00+08:00', '已下班'],
    ['2026-11-22T10:00:00+08:00', '今天休息'],
  ]) {
    await page.clock.setSystemTime(new Date(time!));
    await page.clock.runFor(1000);
    await expect(orb).toContainText(label!);
  }
  await orb.click();
  await page.getByLabel('上班时间', { exact: true }).fill('23:00');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('请检查');
  await page.getByLabel('上班时间', { exact: true }).fill('09:00');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'fish-island:work-schedule') throw new Error('合成存储失败，请重试');
      original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('合成存储失败');
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await page.setViewportSize({ width: 375, height: 640 });
  const rect = (await orb.boundingBox())!;
  expect(rect.x + rect.width).toBeLessThanOrEqual(363);
  expect(rect.y + rect.height).toBeLessThanOrEqual(560);
});

test('双指操作不打断主指拖动', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, 'wechat', 'light');
  const orb = page.getByRole('button', { name: '工作时间设置' });
  await orb.focus();
  const box = (await orb.boundingBox())!;
  const primary = { id: 1, x: box.x + 40, y: box.y + 40 };
  const secondary = { id: 2, x: box.x + 20, y: box.y + 50 };
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [primary] });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [primary, secondary],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [primary] });
  await expect(orb).toHaveAttribute('data-dragging', 'true');
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ ...primary, x: primary.x - 120 }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(orb).toHaveAttribute('data-dragging', 'false');
  await expect(orb).toHaveAttribute('data-side', 'none');
  expect((await orb.boundingBox())!.x).toBeLessThan(box.x - 80);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await cdp.detach();
});
