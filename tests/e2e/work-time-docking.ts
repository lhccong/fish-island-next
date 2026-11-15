import { expect, type Page, type TestInfo } from '@playwright/test';

async function dragOrb(page: Page, mobile: boolean, x: number, y: number, cancel = false) {
  const orb = page.locator('button[aria-label="工作时间设置"]');
  const box = (await orb.boundingBox())!;
  const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  if (mobile) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', {
      type: cancel ? 'touchCancel' : 'touchEnd',
      touchPoints: [],
    });
    await cdp.detach();
  } else {
    await orb.evaluate((el) =>
      el.addEventListener(
        'pointerdown',
        (event) => {
          (el as HTMLElement).dataset.testPointerId = String((event as PointerEvent).pointerId);
        },
        { once: true },
      ),
    );
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(x, y, { steps: 6 });
    if (cancel)
      await orb.evaluate((el) =>
        el.dispatchEvent(
          new PointerEvent('pointercancel', {
            pointerId: Number((el as HTMLElement).dataset.testPointerId),
            bubbles: true,
          }),
        ),
      );
    await page.mouse.up();
  }
}

export async function verifyDocking(page: Page, width: number, info?: TestInfo) {
  const mobile = width < 760;
  const orb = page.locator('button[aria-label="工作时间设置"]');
  const dialog = page.getByRole('dialog', { name: '工作时间', exact: true });
  if (await dialog.isVisible()) await page.getByRole('button', { name: '关闭工作时间' }).click();
  await orb.focus();
  await orb.press('End');
  await expect(orb).toHaveAttribute('data-side', 'right');
  await orb.evaluate((el) => el.blur());
  await page.mouse.move(200, 20);
  await page.clock.runFor(3000);
  await expect(orb).toHaveAttribute('data-collapsed', 'true');
  await expect.poll(async () => (await orb.boundingBox())?.width).toBe(44);
  let box = (await orb.boundingBox())!;
  expect(box.width).toBe(44);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
  if (info) await page.screenshot({ path: info.outputPath('dock-right.png') });
  if (mobile) {
    await page.touchscreen.tap(box.x + 22, box.y + 32);
    await expect(orb).toHaveAttribute('data-collapsed', 'false');
    await expect(dialog).toHaveCount(0);
    await expect.poll(async () => (await orb.boundingBox())?.width).toBe(80);
    box = (await orb.boundingBox())!;
    await page.touchscreen.tap(box.x + 40, box.y + 40);
  } else {
    await page.mouse.move(box.x + 22, box.y + 32);
    await expect(orb).toHaveAttribute('data-collapsed', 'false');
    await page.clock.runFor(4000);
    await expect(orb).toHaveAttribute('data-collapsed', 'false');
    await orb.click();
  }
  await expect(dialog).toBeVisible();
  await page.clock.runFor(4000);
  await expect(orb).toHaveAttribute('data-collapsed', 'false');
  await page.getByRole('button', { name: '关闭工作时间' }).click();
  await page.clock.runFor(250);
  box = (await orb.boundingBox())!;
  await dragOrb(page, mobile, 28, box.y + 40);
  await expect(orb).toHaveAttribute('data-side', 'left');
  await expect(dialog).toHaveCount(0);
  await orb.evaluate((el) => el.blur());
  await page.mouse.move(200, 20);
  await page.clock.runFor(3000);
  await expect(orb).toHaveAttribute('data-collapsed', 'true');
  await expect.poll(async () => (await orb.boundingBox())?.width).toBe(44);
  box = (await orb.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.width).toBe(44);
  if (info) await page.screenshot({ path: info.outputPath('dock-left.png') });
  await dragOrb(page, mobile, width / 2, box.y - 60);
  await expect(orb).toHaveAttribute('data-side', 'none');
  await expect(orb).toHaveAttribute('data-collapsed', 'false');
  await expect(dialog).toHaveCount(0);
  await page.mouse.move(200, 20);
  await page.clock.runFor(3000);
  await expect(orb).toHaveAttribute('data-collapsed', 'false');
  const free = (await orb.boundingBox())!;
  await dragOrb(page, mobile, free.x + 100, free.y + 90, true);
  await page.clock.runFor(250);
  await expect.poll(async () => Math.abs((await orb.boundingBox())!.x - free.x)).toBeLessThan(2);
  await expect(dialog).toHaveCount(0);
  await orb.focus();
  await orb.press('Home');
  await page.clock.runFor(4000);
  await expect(orb).toHaveAttribute('data-collapsed', 'false');
  await orb.press('Escape');
  await expect(orb).toHaveAttribute('data-collapsed', 'true');
  await orb.press('Enter');
  await expect(orb).toHaveAttribute('data-collapsed', 'false');
  await expect(dialog).toHaveCount(0);
  await orb.press('Enter');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(orb).toBeFocused();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(orb).toHaveAttribute('data-side', 'left');
  await page.mouse.move(200, 20);
  await page.clock.runFor(3000);
  await expect(orb).toHaveAttribute('data-collapsed', 'true');
  await page.getByRole('button', { name: '用户菜单', exact: true }).click();
  await page.getByRole('menuitem', { name: /切换(明亮模式|深色模式)/ }).click();
  await expect(orb).toHaveAttribute('data-collapsed', 'true');
  await expect(orb).toHaveAttribute('data-side', 'left');
  await page.getByRole('button', { name: '用户菜单', exact: true }).click();
  await page.getByRole('menuitem', { name: '隐藏工作时间' }).click();
  await expect(orb).toHaveCount(0);
  await page.clock.runFor(4000);
  await page.getByRole('button', { name: '用户菜单', exact: true }).click();
  await page.getByRole('menuitem', { name: '显示工作时间' }).click();
  await expect(orb).toHaveAttribute('data-side', 'left');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(1);
}
