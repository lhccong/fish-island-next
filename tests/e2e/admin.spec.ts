import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupAdmin, adminRoutes, adminMenu } from './admin-fixture';
import { assertLegacyLayout } from './admin-layout-assertions';
test.setTimeout(240_000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    test(`${skin.id} ${mode}: all administration pages and states`, async ({
      page,
      isMobile,
    }, info) => {
      const state = await setupAdmin(page, skin.id, mode);
      await page.goto('/discover', { waitUntil: 'domcontentloaded' });
      const primary = page.getByRole('navigation', { name: '主要功能' });
      if (isMobile)
        await expect(primary.getByRole('link', { name: '管理页', exact: true })).toHaveCount(0);
      else {
        const entry = primary.getByRole('link', { name: '管理页', exact: true });
        await expect(entry).toBeVisible();
        const adminBounds = (await entry.boundingBox())!;
        const discoveryBounds = (await primary
          .getByRole('link', { name: '鱼小圈', exact: true })
          .boundingBox())!;
        expect(
          skin.id === 'wps' ? adminBounds.x > discoveryBounds.x : adminBounds.y > discoveryBounds.y,
        ).toBe(true);
        await expect(
          page
            .getByRole('navigation', { name: '发现菜单' })
            .getByRole('link', { name: '管理页', exact: true }),
        ).toHaveCount(0);
      }
      await page.getByRole('link', { name: '管理页', exact: true }).click();
      const management = page
        .getByRole('navigation', { name: '管理导航' })
        .filter({ visible: true });
      await expect(management.getByRole('link')).toHaveText(adminRoutes.map((r) => r[1]));
      await expect(page.getByRole('menu')).toHaveCount(0);
      await page.screenshot({ path: info.outputPath('admin-navigation.png') });
      for (const [path, label] of adminRoutes) {
        await adminMenu(page, label);
        await expect(page).toHaveURL(path);
        const refresh = page.getByRole('button', { name: '刷新', exact: true });
        await expect(
          page.getByRole('heading', { name: label, exact: true, level: 1 }),
        ).toBeVisible();
        if (path.endsWith('/data'))
          await expect(page.getByText('新增用户走势图', { exact: true })).toBeVisible();
        else await expect(page.locator('[data-admin-record]')).toHaveCount(1);
        await assertLegacyLayout(page, path, isMobile);
        await page.screenshot({ path: info.outputPath(`${label}-legacy-layout.png`) });
        state.delay = 600;
        await refresh.click();
        await expect(page.getByRole('status').filter({ hasText: '正在加载' })).toBeVisible();
        state.delay = 0;
        if (path.endsWith('/data'))
          await expect(page.getByText('新增用户走势图', { exact: true })).toBeVisible();
        else await expect(page.locator('[data-admin-record]')).toHaveCount(1);
        state.phase = 'error';
        await refresh.click();
        await expect(page.getByRole('alert')).toContainText('503');
        state.phase = 'empty';
        await page.getByRole('button', { name: '重试', exact: true }).click();
        await expect(
          page.getByText(path.endsWith('/data') ? '该时段暂无新增用户数据' : /暂无记录/),
        ).toBeVisible();
        state.phase = 'success';
        await refresh.click();
        if (!path.endsWith('/data'))
          await expect(page.locator('[data-admin-record]')).toHaveCount(1);
        else await expect(page.getByText('新增用户走势图', { exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        if (!path.endsWith('/data') && !path.endsWith('/report')) {
          await page.getByRole('button', { name: '修改', exact: true }).click();
          const dialog = page.getByRole('dialog');
          await expect(dialog).toBeVisible();
          const scroll = dialog.getByRole('region');
          expect(await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
          if (path.includes('itemTemplates')) {
            await scroll.evaluate((el) => {
              el.scrollTop = el.scrollHeight;
            });
            await expect(dialog.getByLabel('抗吸血（%）', { exact: true })).toBeVisible();
            await dialog.getByLabel('抗吸血（%）', { exact: true }).focus();
            if (isMobile)
              expect(await dialog.locator('[data-radix-scroll-area-scrollbar]').count()).toBe(0);
          }
          const choice = dialog.getByRole('combobox').first();
          if (await choice.count()) {
            await choice.click();
            await expect(page.getByRole('listbox')).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(choice).toBeFocused();
          }
          if (path.includes('itemTemplates'))
            await page.screenshot({ path: info.outputPath(`${skin.id}-${mode}-equipment.png`) });
          await dialog.getByRole('button', { name: /^关闭/ }).first().click();
          await expect(dialog).toHaveCount(0);
          await expect(page.getByRole('button', { name: '修改', exact: true })).toBeFocused();
        }
      }
    });
test('ordinary account and anonymous direct URLs never request admin data', async ({ page }) => {
  const state = await setupAdmin(page, 'wechat', 'light', 'user');
  await page.goto('/discover', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('link', { name: '管理页', exact: true })).toHaveCount(0);
  for (const [path] of adminRoutes) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('alert')).toContainText('仅管理员');
  }
  expect(state.requests).toHaveLength(0);
  await page.evaluate(() => {
    sessionStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
  });
  await expect(page).toHaveURL(/user\/login/);
  expect(state.requests).toHaveLength(0);
});
test('CRUD, assignment, script marking, report handling and mute use legacy protocols', async ({
  page,
}) => {
  const state = await setupAdmin(page);
  await page.goto('/admin/title', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '新建', exact: true }).click();
  await page.getByRole('dialog').getByLabel('称号名称', { exact: true }).fill('新合成称号');
  state.mutationFail = true;
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('合成操作失败');
  await expect(page.getByRole('dialog').getByLabel('称号名称', { exact: true })).toHaveValue(
    '新合成称号',
  );
  state.mutationFail = false;
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: '删除', exact: true }).click();
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.requests.find((r) => r.path === 'user/title/add')?.body).toEqual({
    name: '新合成称号',
  });
  expect(state.requests.find((r) => r.path === 'user/title/delete')?.body).toEqual({ id: '30' });
  await adminMenu(page, '用户管理');
  await page.getByRole('button', { name: '查看称号' }).click();
  await page.getByRole('button', { name: '分配 合成称号' }).click();
  await expect(page.getByRole('button', { name: '移除 合成称号' })).toBeVisible();
  await page.getByRole('button', { name: '移除 合成称号' }).click();
  await expect(page.getByText('该用户暂无称号')).toBeVisible();
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '封禁脚本', exact: true }).click();
  await page.getByRole('button', { name: '确认', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.requests.find((r) => r.path === 'redpacket/script/mark')?.query).toEqual({
    userId: '1',
    mark: 'true',
  });
  expect(state.requests.find((r) => r.path === 'user/title/add/toUser')?.query).toEqual({
    userId: '1',
    titleId: '30',
  });
  await adminMenu(page, '举报管理');
  await page.getByRole('button', { name: '处理', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('合成举报内容', { exact: true })).toBeVisible();
  await page.getByLabel('处理备注', { exact: true }).fill('合成处理备注');
  await page.getByRole('button', { name: '提交处理', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.requests.find((r) => r.path === 'report/admin/handle')?.body).toEqual({
    id: '1',
    status: 1,
    handleRemark: '合成处理备注',
  });
  await page.getByRole('button', { name: '禁言', exact: true }).click();
  await page.getByLabel('禁言时间（秒）').fill('600');
  await page.getByRole('button', { name: '确认禁言' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.requests.find((r) => r.path === 'user/mute/add')?.body).toEqual({
    userId: '700',
    duration: 600,
  });
});
test('scroll pagination retains content on failure, deduplicates and resets filters', async ({
  page,
}) => {
  const state = await setupAdmin(page);
  state.total = 45;
  state.batch = 20;
  await page.goto('/admin/user', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-admin-record]')).toHaveCount(20);
  const viewport = page.getByRole('region', { name: '主内容滚动区', exact: true });
  state.phase = 'error';
  await viewport.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(page.getByRole('button', { name: '重试管理列表' })).toBeVisible();
  await expect(page.locator('[data-admin-record]')).toHaveCount(20);
  const requests = state.requests.length;
  await page.waitForTimeout(200);
  expect(state.requests.length).toBe(requests);
  state.phase = 'success';
  await page.getByRole('button', { name: '重试管理列表' }).click();
  await expect(page.locator('[data-admin-record]')).toHaveCount(40);
  await viewport.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(page.locator('[data-admin-record]')).toHaveCount(45);
  await expect(page.getByText('已全部加载', { exact: true })).toBeVisible();
  state.duplicate = true;
  state.total = 60;
  await page.getByRole('button', { name: '刷新', exact: true }).click();
  await expect(page.locator('[data-admin-record]')).toHaveCount(20);
  await viewport.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(page.getByText('已全部加载', { exact: true })).toBeVisible();
  await expect(page.locator('[data-admin-record]')).toHaveCount(20);
  state.total = 1;
  state.batch = 1;
  await page.getByLabel('用户名', { exact: true }).fill('筛选合成');
  await page.getByRole('button', { name: '查询', exact: true }).click();
  await expect(page.locator('[data-admin-record]')).toHaveCount(1);
  expect(state.requests.at(-1)?.body).toMatchObject({ current: 1, userName: '筛选合成' });
});
test('appearance changes preserve editor draft, filter and request count', async ({ page }) => {
  const state = await setupAdmin(page);
  await page.goto('/admin/title', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('称号名称', { exact: true }).fill('筛选草稿');
  await page.getByRole('button', { name: '修改', exact: true }).click();
  const input = page
    .getByRole('dialog', { name: '修改称号', includeHidden: true })
    .getByLabel('称号名称', { exact: true });
  await input.fill('编辑草稿');
  const count = state.requests.length;
  await page
    .getByRole('button', { name: '切换主题', exact: true, includeHidden: true })
    .evaluate((el: HTMLButtonElement) => el.click());
  const picker = page.getByRole('dialog', { name: '主题模式' });
  for (const skin of builtinSkins)
    for (const mode of ['light', 'dark']) {
      await picker.getByRole('button', { name: skin.name, exact: true }).click();
      await picker
        .getByRole('button', { name: mode === 'light' ? '明亮模式' : '暗夜模式', exact: true })
        .click();
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
      await expect(input).toHaveValue('编辑草稿');
    }
  expect(state.requests.length).toBe(count);
  await picker.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '关闭修改称号' }).click();
  await expect(page.getByLabel('称号名称', { exact: true })).toHaveValue('筛选草稿');
});
