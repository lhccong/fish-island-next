import { expect, test, type Page, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupAdmin, adminMenu } from './admin-fixture';
test.setTimeout(90_000);
async function scrollBody(page: Page, region: Locator, mobile: boolean) {
  const box = (await region.boundingBox())!;
  if (!mobile) {
    await region.hover();
    await page.mouse.wheel(0, 900);
    return;
  }
  const session = await page.context().newCDPSession(page);
  const x = box.x + box.width / 2;
  const start = box.y + box.height - 30;
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y: start }],
  });
  for (let i = 1; i <= 6; i++)
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: start - ((box.height - 65) * i) / 6 }],
    });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
}
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    test(`${skin.id} ${mode}: administration submits, reports and touch scroll`, async ({
      page,
      isMobile,
    }, info) => {
      const state = await setupAdmin(page, skin.id, mode);
      await page.goto('/admin/title', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: '修改', exact: true }).click();
      let dialog = page.getByRole('dialog');
      const title = dialog.getByLabel('称号名称', { exact: true });
      await title.fill('合成编辑称号');
      state.mutationFail = true;
      await dialog.getByRole('button', { name: '保存', exact: true }).click();
      await expect(dialog.getByRole('alert')).toContainText('合成操作失败');
      await expect(title).toHaveValue('合成编辑称号');
      state.mutationFail = false;
      await dialog.getByRole('button', { name: '保存', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await adminMenu(page, '装备管理');
      await page.getByRole('button', { name: '修改', exact: true }).click();
      dialog = page.getByRole('dialog');
      const region = dialog.getByRole('region');
      expect(
        await region.evaluate((el) => Number.parseFloat(getComputedStyle(el).paddingInlineEnd)),
      ).toBeGreaterThanOrEqual(isMobile ? 20 : 24);
      const scrollBefore = await region.evaluate((el) => el.scrollTop);
      await scrollBody(page, region, isMobile);
      await expect.poll(() => region.evaluate((el) => el.scrollTop)).toBeGreaterThan(scrollBefore);
      for (let i = 0; i < 8; i++) {
        if (await dialog.getByLabel('物品描述', { exact: true }).isVisible()) {
          const b = await dialog.getByLabel('物品描述', { exact: true }).boundingBox();
          const r = await region.boundingBox();
          if (b && r && b.y >= r.y && b.y + b.height <= r.y + r.height) break;
        }
        await scrollBody(page, region, isMobile);
      }
      await dialog.getByLabel('物品描述', { exact: true }).fill('合成装备描述');
      await dialog.getByLabel('抗吸血（%）', { exact: true }).focus();
      expect(await region.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath('equipment-bottom.png') });
      await dialog.getByRole('button', { name: '保存', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      expect(state.requests.find((r) => r.path === 'itemTemplates/edit')?.body).toMatchObject({
        mainAttr: { critRate: 0.03, futureAttribute: 0.07 },
        description: '合成装备描述',
      });
      await adminMenu(page, '举报管理');
      await page.getByRole('button', { name: '处理', exact: true }).click();
      dialog = page.getByRole('dialog');
      await dialog.getByRole('combobox', { name: '处理结果' }).click();
      await page.getByRole('option', { name: '已驳回' }).click();
      await dialog.getByLabel('处理备注', { exact: true }).fill('合成驳回说明');
      state.mutationFail = true;
      await dialog.getByRole('button', { name: '提交处理', exact: true }).click();
      await expect(dialog.getByRole('alert')).toContainText('合成操作失败');
      state.mutationFail = false;
      await dialog.getByRole('button', { name: '提交处理', exact: true }).click();
      await expect(dialog).toHaveCount(0);
      expect(
        state.requests.filter((r) => r.path === 'report/admin/handle').at(-1)?.body,
      ).toMatchObject({ status: 2, handleRemark: '合成驳回说明' });
      await page.getByRole('button', { name: '禁言', exact: true }).click();
      dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: '确认禁言' }).click();
      await expect(dialog).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await adminMenu(page, '用户管理');
      await page.getByRole('button', { name: '查看称号' }).click();
      const titles = page.getByRole('dialog', { name: '用户称号' });
      await expect(titles.getByRole('button', { name: '分配 合成称号' })).toBeVisible();
      await expect(titles.getByRole('table')).toHaveCount(2);
      const bounds = (await titles.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      await titles.getByRole('button', { name: '分配 合成称号' }).click();
      await expect(titles.getByRole('button', { name: '移除 合成称号' })).toBeVisible();
      await titles.getByRole('button', { name: '移除 合成称号' }).click();
      await expect(titles.getByText('该用户暂无称号')).toBeVisible();
      await page.screenshot({ path: info.outputPath('user-titles-legacy-layout.png') });
      await titles.getByRole('button', { name: '关闭用户称号', exact: true }).click();
    });
test('creates and edits users, tags and words through explicit forms', async ({ page }) => {
  const state = await setupAdmin(page);
  await page.goto('/admin/user', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '新建', exact: true }).click();
  let d = page.getByRole('dialog');
  await d.getByLabel('账号', { exact: true }).fill('synthetic-new-account');
  await d.getByLabel('用户名', { exact: true }).fill('合成新用户');
  await d.getByRole('button', { name: '保存', exact: true }).click();
  await expect(d).toHaveCount(0);
  expect(state.requests.find((r) => r.path === 'user/add')?.body).toMatchObject({
    userAccount: 'synthetic-new-account',
    userName: '合成新用户',
    userRole: 'user',
  });
  await adminMenu(page, '标签管理');
  await page.getByRole('button', { name: '新建', exact: true }).click();
  d = page.getByRole('dialog');
  await d.getByLabel('标签名称', { exact: true }).fill('合成新标签');
  await d.getByRole('button', { name: '保存', exact: true }).click();
  await expect(d).toHaveCount(0);
  expect(state.requests.find((r) => r.path === 'tags/add')?.body).toMatchObject({
    tagsName: '合成新标签',
  });
  await adminMenu(page, '词库管理');
  await page.getByRole('button', { name: '新建', exact: true }).click();
  d = page.getByRole('dialog');
  await d.getByLabel('单词', { exact: true }).fill('海浪');
  await d.getByLabel('类型', { exact: true }).fill('合成分类');
  await d.getByRole('button', { name: '保存', exact: true }).click();
  await expect(d).toHaveCount(0);
  expect(state.requests.find((r) => r.path === 'word/library/add')?.body).toMatchObject({
    word: '海浪',
    wordType: '合成分类',
    category: 'undercover',
  });
});
