import { expect, test, type Locator, type Page } from '@playwright/test';

let captureIndex = 0;
export async function capture(page: Page, label: string) {
  if (!process.env.ACCOUNT_VISUAL_CAPTURE) return;
  await page.screenshot({ path: test.info().outputPath(`${++captureIndex}-${label}.png`) });
}

export async function open(page: Page, name: string) {
  if (!(await page.getByRole('button', { name: '用户菜单', exact: true }).count()))
    await page.getByRole('link', { name: '返回热榜', exact: true }).click();
  await page.getByRole('button', { name: '用户菜单', exact: true }).click();
  const item = page.getByRole('menuitem', { name, exact: true });
  if (page.viewportSize()!.width < 760) await item.tap();
  else await item.click();
  return page.getByRole('dialog');
}
export async function close(page: Page) {
  await capture(
    page,
    (await page.getByRole('dialog').getByRole('heading', { level: 2 }).textContent()) ?? '账号工具',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '用户菜单', exact: true })).toBeFocused();
}

export async function scrollRegion(page: Page, region: Locator, mobile: boolean) {
  if (mobile) {
    const box = (await region.boundingBox())!;
    const session = await page.context().newCDPSession(page);
    const x = box.x + box.width / 2;
    const y = box.y + box.height - 24;
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y }],
    });
    for (let step = 1; step <= 6; step++) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: y - (Math.min(180, box.height / 2) * step) / 6 }],
      });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await session.detach();
  } else {
    await region.hover();
    await page.mouse.wheel(0, 300);
  }
}

export async function layout(page: Page, mobile: boolean) {
  const dialog = page.getByRole('dialog');
  const bounds = await dialog.evaluate((el) => ({
    right: el.getBoundingClientRect().right,
    left: el.getBoundingClientRect().left,
    overflow: el.scrollWidth > el.clientWidth,
  }));
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(bounds.overflow).toBe(false);
  await capture(
    page,
    `${(await dialog.getByRole('heading', { level: 2 }).textContent()) ?? '账号工具'}-top`,
  );
  const region = dialog.getByRole('region').first();
  if (await region.count()) {
    if (await region.evaluate((el) => el.scrollHeight > el.clientHeight + 8)) {
      await region.evaluate((el) => {
        el.scrollTop = 0;
      });
      await scrollRegion(page, region, mobile);
      await expect.poll(() => region.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    }
    const gutter = await region.evaluate((el) =>
      Number.parseFloat(getComputedStyle(el).paddingInlineEnd),
    );
    expect(gutter).toBeGreaterThanOrEqual(mobile ? 20 : 24);
    await region.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const result = await region.evaluate((el) => ({
      overflow: el.scrollWidth > el.clientWidth + 1,
      bottom: el.scrollHeight - el.clientHeight - el.scrollTop,
    }));
    expect(result.overflow).toBe(false);
    expect(result.bottom).toBeLessThanOrEqual(1);
  }
  await capture(
    page,
    (await dialog.getByRole('heading', { level: 2 }).textContent()) ?? '账号工具',
  );
}
