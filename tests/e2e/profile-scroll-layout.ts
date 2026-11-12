import { expect, type Page } from '@playwright/test';

export async function checkProfileScrollGutter(page: Page) {
  const viewport = page.getByRole('region', { name: '个人资料编辑区', exact: true });
  const rail = viewport.locator('..').locator('[data-orientation="vertical"]');
  await viewport.hover();
  await expect(rail).toBeVisible();
  const content = page.getByRole('region', { name: '头像设置', exact: true });
  const contentBox = (await content.boundingBox())!;
  const railBox = (await rail.boundingBox())!;
  const viewportBox = (await viewport.boundingBox())!;
  const mobile = page.viewportSize()!.width <= 760;
  expect(railBox.x - contentBox.x - contentBox.width).toBeGreaterThanOrEqual(
    (mobile ? 12 : 16) - 0.5,
  );
  expect(railBox.y).toBeGreaterThanOrEqual(viewportBox.y - 0.5);
  expect(railBox.y + railBox.height).toBeLessThanOrEqual(viewportBox.y + viewportBox.height + 0.5);
  expect(await viewport.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  );
  return { viewport, viewportBox, railBox };
}

export async function checkProfileScrollLayout(page: Page) {
  const { viewport, viewportBox, railBox } = await checkProfileScrollGutter(page);
  await viewport.evaluate((element) => {
    element.scrollTop = 0;
  });
  const name = page.getByRole('textbox', { name: '用户名', exact: true });
  await name.focus();
  const nameBox = (await name.boundingBox())!;
  expect(nameBox.x - viewportBox.x).toBeGreaterThanOrEqual(4 - 0.5);
  expect(nameBox.y - viewportBox.y).toBeGreaterThanOrEqual(4 - 0.5);
  await viewport.focus();
  await viewport.press('End');
  await expect
    .poll(() =>
      viewport.evaluate(
        (element) => element.scrollHeight - element.clientHeight - element.scrollTop,
      ),
    )
    .toBeLessThanOrEqual(1);
  const last = page.getByRole('region', { name: '破蛋日', exact: true });
  const lastBox = (await last.boundingBox())!;
  expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(viewportBox.y + viewportBox.height - 4);
  const save = page.getByRole('button', { name: '保存修改', exact: true });
  const saveBox = (await save.boundingBox())!;
  expect(saveBox.y).toBeGreaterThanOrEqual(viewportBox.y + viewportBox.height);
  await page.getByRole('textbox', { name: '个人简介' }).focus();
  const fieldBox = (await page.getByRole('textbox', { name: '个人简介' }).boundingBox())!;
  expect(fieldBox.x + fieldBox.width + 4).toBeLessThanOrEqual(railBox.x);
  expect(fieldBox.y + fieldBox.height).toBeLessThanOrEqual(viewportBox.y + viewportBox.height);
  await viewport.evaluate((element) => {
    element.scrollTop = 0;
  });
}
