import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { chooseDraftColor, checkRowColor } from './todo-tool-colors';
import { prior, today, oldTask, weekly, mockAccount } from './todo-tool-fixture';

for (const skin of builtinSkins) {
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: legacy todo entry, states and mutations`, async ({ page }, info) => {
      test.setTimeout(60_000);
      const mobile = page.viewportSize()!.width <= 760;
      const activate = (element: Locator) => (mobile ? element.tap() : element.click());
      const capture =
        (skin.id === 'moyu-island' && !mobile) ||
        (skin.id === 'pixel-island' && mobile && mode === 'dark');
      await mockAccount(page, skin.id, mode);
      let reads = 0;
      let failRead = true;
      let data: object[] = [weekly, oldTask];
      let writes = 0;
      let allowRead!: () => void;
      const blockRead = new Promise<void>((resolve) => {
        allowRead = resolve;
      });
      await page.route('**/api/todo/get', async (route) => {
        expect(route.request().method()).toBe('POST');
        reads++;
        if (failRead) {
          await blockRead;
          await route.fulfill({ status: 503 });
        } else {
          await route.fulfill({ json: { code: 0, data: JSON.stringify(data) } });
        }
      });
      let allowWrite!: () => void;
      const blockWrite = new Promise<void>((resolve) => {
        allowWrite = resolve;
      });
      await page.route('**/api/todo/save', async (route) => {
        expect(route.request().method()).toBe('POST');
        if (++writes === 1) {
          await blockWrite;
          await route.fulfill({ status: 503 });
          return;
        }
        data = route.request().postDataJSON().todoData;
        await route.fulfill({ json: { code: 0, data: null } });
      });

      await page.goto('/');
      const navigation = page.getByRole('navigation', { name: '主要功能' });
      if (mobile) await activate(navigation.getByRole('link', { name: '发现', exact: true }));
      const menu = mobile ? page.getByRole('navigation', { name: '发现菜单' }) : navigation;
      const toolLink = menu.getByRole('link', { name: '工具', exact: true });
      await activate(toolLink);
      const tab = page.getByRole('tab', { name: '待办', exact: true });
      await activate(tab);
      await expect(page).toHaveURL('/utils/todo');
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
      if (!mobile) await expect(toolLink).toHaveAttribute('aria-current', 'page');
      const panel = page.getByRole('tabpanel', { name: '待办' });
      const button = (name: string | RegExp) => panel.getByRole('button', { name, exact: true });
      try {
        const loading = panel.getByRole('status').filter({ hasText: '正在加载待办' });
        await expect(loading).toBeVisible();
        await expect(loading.locator('svg')).toBeVisible();
      } finally {
        allowRead();
      }
      await expect(panel.getByRole('alert')).toHaveText('待办加载失败，请重试');
      failRead = false;
      await activate(button('重试'));
      await expect(panel.getByText('当天暂无待办')).toBeVisible();
      const initialReads = reads;
      expect(writes).toBe(0);
      const range = panel.getByRole('group', { name: '查看范围' });
      const month = range.getByRole('button', { name: '整月' });
      const calendarTab = range.getByRole('button', { name: '日历' });
      await activate(calendarTab);
      await expect(calendarTab).toHaveAttribute('aria-pressed', 'true');
      const overview = panel.getByRole('complementary', { name: '待办日历' });
      await activate(overview.getByRole('button', { name: '下个月' }));
      await expect(overview.getByRole('group', { name: '2026 年 12 月' })).toBeVisible();
      await activate(overview.getByRole('button', { name: '上个月' }));
      const dateWithTasks = overview.getByRole('button', { name: `${prior}，1 项任务` });
      await expect(dateWithTasks.locator('span')).toHaveText('1');
      await activate(dateWithTasks);
      await expect(panel.getByRole('heading', { name: '11月1日 周日' })).toBeVisible();
      await expect(panel.getByText('旧版描述')).toBeVisible();
      if (capture) {
        await page.screenshot({ path: info.outputPath('todo-calendar.png') });
      }
      await activate(month);
      await expect(month).toHaveAttribute('aria-pressed', 'true');
      await expect(overview).toBeHidden();
      await expect(panel.getByText('旧版描述')).toBeVisible();
      await expect(panel.getByText('备注：旧版备注')).toBeVisible();
      await expect(panel.getByText('旧版周报')).toHaveCount(0);

      await activate(button(/打开日历/));
      const calendar = panel.getByRole('complementary', { name: '待办日历' });
      const first = calendar.getByRole('button', { name: `${prior}，1 项任务` });
      await expect(first).toBeVisible();
      await activate(first);
      await expect(first).toHaveAttribute('aria-pressed', 'true');
      const list = panel.getByRole('region', { name: '待办列表' });
      const [calendarBox, listBox] = await Promise.all([
        calendar.boundingBox(),
        list.boundingBox(),
      ]);
      if (mobile) expect(calendarBox!.y + calendarBox!.height).toBeLessThan(listBox!.y);
      else expect(calendarBox!.x + calendarBox!.width).toBeLessThan(listBox!.x);
      if (capture) {
        await page.screenshot({ path: info.outputPath('todo-panel.png') });
      }

      await activate(button('添加待办'));
      const dialog = page.getByRole('dialog', { name: '添加待办' });
      const title = dialog.getByRole('textbox', { name: '任务标题' });
      const add = dialog.getByRole('button', { name: '添加', exact: true });
      await expect(add).toBeDisabled();
      await title.fill('新建的待办');
      await dialog.getByRole('textbox', { name: '任务描述' }).fill('自定义颜色的描述');
      await activate(dialog.getByRole('button', { name: /开始日期/ }));
      await activate(dialog.getByRole('button', { name: today, exact: true }));
      const priority = dialog.getByRole('combobox', { name: '优先级' });
      await activate(priority);
      await activate(page.getByRole('option', { name: '高优先级' }));
      await expect(priority).toHaveText('高优先级');
      const viewport = dialog.getByRole('region', { name: '待办表单滚动区' });
      const scrollbar = viewport.locator('..').locator('[data-orientation=vertical]');
      await expect(scrollbar).toHaveCSS('visibility', mobile ? 'hidden' : 'visible');
      if (!mobile) await expect(scrollbar).toHaveCSS('opacity', '1');
      expect(
        await viewport.evaluate((node) => ({
          overflow: node.scrollWidth - node.clientWidth,
          gutter: parseInt(getComputedStyle(node).paddingInlineEnd),
        })),
      ).toEqual({ overflow: 0, gutter: mobile ? 20 : 24 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        page.viewportSize()!.width,
      );

      if (mobile) {
        await viewport.evaluate((node) => {
          node.scrollTop = 0;
        });
        const bounds = (await viewport.boundingBox())!;
        const cdp = await page.context().newCDPSession(page);
        const x = bounds.x + bounds.width / 2;
        const y = bounds.y + bounds.height - 24;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (const distance of [20, 45, 70, 95, 120]) {
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y - distance }],
          });
        }
        await expect.poll(() => viewport.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
        await viewport.evaluate(() => new Promise((resolve) => setTimeout(resolve, 160)));
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await cdp.detach();
      } else {
        await viewport.focus();
        await viewport.press('End');
      }
      await expect.poll(() => viewport.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
      await chooseDraftColor(page, dialog, activate);
      await dialog.getByRole('textbox', { name: '备注' }).fill('新的备注');
      if (capture) {
        await page.screenshot({ path: info.outputPath('todo-form.png') });
      }
      await activate(add);
      try {
        await expect(dialog.getByRole('status').filter({ hasText: '正在保存' })).toBeVisible();
        await expect(add).toBeDisabled();
      } finally {
        allowWrite();
      }
      await expect(dialog.getByRole('alert')).toContainText('保存待办失败');
      await expect(title).toHaveValue('新建的待办');
      await activate(add);
      await expect(dialog).toHaveCount(0);
      const item = list.getByRole('listitem').filter({ hasText: '新建的待办' });
      await expect(item).toContainText('新的备注');
      await expect(item).toContainText(today);
      expect(data).toContainEqual(oldTask);
      expect(data).toContainEqual(weekly);
      expect(data).toContainEqual(
        expect.objectContaining({ title: '新建的待办', bgColor: '#123456' }),
      );
      await checkRowColor(
        page,
        item,
        activate,
        capture ? info.outputPath('todo-palette.png') : undefined,
      );
      expect(data).toContainEqual(
        expect.objectContaining({ title: '新建的待办', bgColor: 'transparent' }),
      );
      const menuTrigger = item.getByRole('button', { name: '更多操作' });
      async function edit() {
        await activate(menuTrigger);
        await activate(page.getByRole('menuitem', { name: '编辑', exact: true }));
      }
      await edit();
      const editDialog = page.getByRole('dialog', { name: '编辑待办' });
      await editDialog.getByRole('textbox', { name: '备注' }).fill('编辑的备注');
      await activate(editDialog.getByRole('button', { name: '保存', exact: true }));
      await expect(item).toContainText('编辑的备注');
      await edit();
      await activate(editDialog.getByRole('button', { name: '关闭待办表单' }));
      await expect(menuTrigger).toBeFocused();
      await activate(item.getByRole('button', { name: '完成', exact: true }));
      await expect(item.getByRole('button', { name: '撤销完成' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await activate(item.getByRole('button', { name: '撤销完成' }));
      await expect(item.getByRole('button', { name: '完成', exact: true })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      for (const name of ['新建的待办', '旧版待办']) {
        const row = list.getByRole('listitem').filter({ hasText: name });
        await activate(row.getByRole('button', { name: '更多操作' }));
        await activate(page.getByRole('menuitem', { name: '删除', exact: true }));
        await activate(
          page
            .getByRole('dialog', { name: '删除待办' })
            .getByRole('button', { name: '删除', exact: true }),
        );
        await expect(row).toHaveCount(0);
        await expect(button(/收起日历/)).toBeFocused();
      }
      expect(data).toEqual([weekly]);
      await expect(panel.getByText('本月暂无待办')).toBeVisible();
      expect(reads).toBe(initialReads);
    });
  }
}

test('legacy link uses the todo tab and guests can open and dismiss login', async ({ page }) => {
  let reads = 0;
  await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
  await page.route('**/api/todo/get', (route) => {
    reads++;
    return route.fulfill({ json: { code: 0, data: null } });
  });
  await page.goto('/todo');
  await expect(page).toHaveURL('/utils/todo');
  const panel = page.getByRole('tabpanel', { name: '待办' });
  await panel.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/\/user\/login\?redirect=/);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL('/utils/todo');
  expect(reads).toBe(0);
});

test('appearance changes preserve the selected day and open form without fetching again', async ({
  page,
}) => {
  await mockAccount(page, 'wechat', 'light');
  let reads = 0;
  await page.route('**/api/todo/get', (route) => {
    reads++;
    return route.fulfill({ json: { code: 0, data: JSON.stringify([oldTask]) } });
  });
  await page.goto('/utils/todo');
  const panel = page.getByRole('tabpanel', { name: '待办' });
  await panel.getByRole('button', { name: /打开日历/ }).click();
  await panel.getByRole('button', { name: `${prior}，1 项任务` }).click();
  await panel.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menuitem', { name: '编辑', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '编辑待办' });
  const title = dialog.getByRole('textbox', { name: '任务标题' });
  await title.fill('正在编辑的标题');
  const requestsBeforeSwitch = reads;
  await page.evaluate(async () => {
    const modulePath = '/src/features/appearance/index.ts';
    const { useAppearanceStore } = await import(modulePath);
    const store = useAppearanceStore.getState();
    store.setSkinId('wps');
    store.setColorMode('dark');
  });
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'wps');
  await expect(page.locator('html')).toHaveAttribute('data-color-mode', 'dark');
  await expect(title).toHaveValue('正在编辑的标题');
  await expect(title).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel.getByRole('button', { name: `${prior}，1 项任务` })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(panel.getByText('旧版待办')).toBeVisible();
  expect(reads).toBe(requestsBeforeSwitch);
});
