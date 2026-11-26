import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { mockAccount, oldTask, prior } from './todo-tool-fixture';

test.setTimeout(60_000);

for (const skin of builtinSkins) {
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: tool windows preserve drafts, requests and scroll`, async ({
      page,
    }, info) => {
      const mobile = page.viewportSize()!.width <= 760;
      const activate = (element: Locator) => (mobile ? element.tap() : element.click());
      const button = (name: string) => page.getByRole('button', { name, exact: true });
      const launch = (name: string) => button(`独立窗口打开${name}`);
      const tab = (name: string) => page.getByRole('tab', { name, exact: true });
      const toolWindow = (name: string) => page.getByRole('dialog', { name, exact: true });
      const dock = page.getByRole('navigation', { name: '已打开的工具' });
      const resume = (name: string) =>
        dock.getByRole('button', { name: `继续${name}`, exact: true });
      await mockAccount(page, skin.id, mode);
      let readCount = 0;
      let failRead = true;
      let allowRead!: () => void;
      const initialRead = new Promise<void>((resolve) => {
        allowRead = resolve;
      });
      await page.route('**/api/todo/get', async (route) => {
        readCount++;
        if (failRead) {
          await initialRead;
          await route.fulfill({ status: 503 });
        } else {
          await route.fulfill({ json: { code: 0, data: JSON.stringify([oldTask]) } });
        }
      });
      let writes = 0;
      await page.route('**/api/todo/save', (route) => {
        expect(route.request().postDataJSON().todoData).toContainEqual(
          expect.objectContaining({ title: '窗口中的待办' }),
        );
        writes++;
        return route.fulfill({ json: { code: 0, data: null } });
      });

      await page.goto('/utils/json');
      const json = toolWindow('JSON 格式化');
      const editor = page.getByRole('textbox', { name: '输入 JSON' });
      const input = '{"正在编辑":[1,2,3]}';
      await expect(editor).toBeEmpty();
      await editor.fill('{"无效":}');
      await expect(page.getByRole('alert')).toContainText('JSON 格式有误');
      await editor.fill(input);
      await activate(button('格式化'));
      expect((await launch('JSON 格式化').boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await activate(launch('JSON 格式化'));
      await expect(json).toBeVisible();
      await expect(json.getByRole('textbox', { name: '输入 JSON' })).toHaveValue(input);
      const output = json.getByRole('region', { name: '结果滚动区' });
      await expect(output).toContainText('正在编辑');
      await expect(page.locator('#json-input')).toHaveCount(1);
      const region = json.getByRole('region', { name: 'JSON 格式化窗口内容' });
      if (mobile) {
        expect((await json.boundingBox())!.width).toBe(page.viewportSize()!.width);
        const box = (await region.boundingBox())!;
        const touch = await page.context().newCDPSession(page);
        const x = box.x + 8;
        const y = box.y + box.height - 32;
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        });
        for (const delta of [20, 50, 85, 120]) {
          await touch.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y - delta }],
          });
        }
        await expect.poll(() => region.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await touch.detach();
      } else {
        const start = (await json.boundingBox())!;
        const title = (await json
          .getByRole('button', { name: '拖动JSON 格式化窗口' })
          .boundingBox())!;
        await page.mouse.move(title.x + 20, title.y + 20);
        await page.mouse.down();
        await page.mouse.move(title.x + 48, title.y + 20);
        await page.mouse.up();
        expect((await json.boundingBox())!.x).toBeGreaterThan(start.x);
        const resize = json.getByRole('button', { name: '调整工具窗口大小' });
        await resize.press('Shift+ArrowLeft');
        await resize.press('Shift+ArrowLeft');
        await expect
          .poll(async () => (await output.boundingBox())!.y - (await editor.boundingBox())!.y)
          .toBeGreaterThan(250);
        await activate(button('最大化工具窗口'));
        expect((await json.boundingBox())!.width).toBe(page.viewportSize()!.width - 16);
        await activate(button('还原工具窗口'));
      }
      await region.focus();
      await region.press('End');
      await expect
        .poll(() =>
          region.evaluate((node) =>
            Math.round(node.scrollHeight - node.clientHeight - node.scrollTop),
          ),
        )
        .toBe(0);
      const geometry = await region.evaluate((node) => ({
        overflow: node.scrollWidth - node.clientWidth,
        gap: parseInt(getComputedStyle(node).paddingInlineEnd),
        scroll: node.scrollTop,
      }));
      expect(geometry.overflow).toBe(0);
      expect(geometry.scroll).toBeGreaterThan(0);
      expect(geometry.gap).toBe(mobile ? 20 : 24);
      await expect(region.locator('..').locator('[data-orientation="vertical"]')).toHaveCSS(
        'visibility',
        mobile ? 'hidden' : 'visible',
      );
      await page.keyboard.press('Escape');
      await expect(json).toBeHidden();
      await expect(launch('JSON 格式化')).toBeFocused();
      await activate(resume('JSON 格式化'));
      await expect(json).toBeVisible();
      await expect.poll(() => region.evaluate((node) => node.scrollTop)).toBe(geometry.scroll);
      await activate(button('收起工具窗口'));

      await activate(tab('待办'));
      await activate(launch('待办'));
      const todo = toolWindow('待办');
      try {
        await expect(todo.getByRole('status').filter({ hasText: '正在加载待办' })).toBeVisible();
      } finally {
        allowRead();
      }
      await expect(todo.getByRole('alert')).toContainText('待办加载失败');
      failRead = false;
      await activate(todo.getByRole('button', { name: '重试' }));
      await expect(todo.getByText('当天暂无待办')).toBeVisible();
      const loaded = readCount;
      if (skin.id === 'moyu-island' && mode === 'light') {
        await page.evaluate(async () => {
          const path = '/src/features/appearance/index.ts';
          const { useAppearanceStore } = await import(path);
          const store = useAppearanceStore.getState();
          store.setSkinId('wps');
          store.setColorMode('dark');
        });
        await expect(page.locator('html')).toHaveAttribute('data-color-mode', 'dark');
        await expect(todo.getByText('当天暂无待办')).toBeVisible();
        expect(readCount).toBe(loaded);
        await page.evaluate(async () => {
          const path = '/src/features/appearance/index.ts';
          const { useAppearanceStore } = await import(path);
          const store = useAppearanceStore.getState();
          store.setSkinId('moyu-island');
          store.setColorMode('light');
        });
      }
      await activate(todo.getByRole('button', { name: '日历', exact: true }));
      const dayWithTasks = todo.getByRole('button', { name: `${prior}，1 项任务` });
      if (mobile) expect((await dayWithTasks.boundingBox())!.width).toBeGreaterThanOrEqual(44);
      await activate(dayWithTasks);
      await expect(todo.getByText('旧版待办')).toBeVisible();
      await activate(todo.getByRole('button', { name: '添加待办', exact: true }));
      const form = page.getByRole('dialog', { name: '添加待办' });
      await form.getByRole('textbox', { name: '任务标题' }).fill('窗口中的待办');
      await activate(form.getByRole('button', { name: '添加', exact: true }));
      await expect(todo.getByText('窗口中的待办')).toBeVisible();
      expect(writes).toBe(1);

      if (
        (skin.id === 'moyu-island' && !mobile) ||
        (skin.id === 'pixel-island' && mobile && mode === 'dark')
      ) {
        await page.screenshot({ path: info.outputPath('todo-window.png') });
      }
      await activate(button('收起工具窗口'));
      await activate(tab('JSON 格式化'));
      await activate(resume('待办'));
      await activate(button('返回待办整页'));
      await expect(page).toHaveURL('/utils/todo');
      const todoPage = page.getByRole('tabpanel', { name: '待办' });
      await expect(todoPage.getByText('窗口中的待办')).toBeVisible();
      await expect(todoPage.getByRole('button', { name: '日历', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(readCount).toBe(loaded);
      await activate(resume('JSON 格式化'));
      await expect(json.getByRole('textbox', { name: '输入 JSON' })).toHaveValue(input);
      await activate(button('返回JSON 格式化整页'));
      await expect(page).toHaveURL('/utils/json');
      await expect(editor).toHaveValue(input);
      await activate(launch('JSON 格式化'));
      await activate(button('关闭工具窗口'));
      await expect(editor).toHaveValue(input);
      await expect(launch('JSON 格式化')).toBeFocused();
      await expect(dock).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
}

test('anonymous todo window resumes after dismissing login', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
  await page.goto('/utils/todo');
  await page.getByRole('button', { name: '独立窗口打开待办', exact: true }).click();
  const todo = page.getByRole('dialog', { name: '待办', exact: true });
  await todo.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/\/user\/login/);
  await expect(todo).toBeHidden();
  await expect(page.getByRole('button', { name: '关闭登录弹窗' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL('/utils/todo');
  await expect(todo.getByText('登录后查看和管理账号待办')).toBeVisible();
});

test('tools and games share the window and resume controls', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
  const mobile = page.viewportSize()!.width <= 760;
  const activate = (element: Locator) => (mobile ? element.tap() : element.click());
  await page.goto('/utils/json');
  const draft = '{"跨页面":true}';
  await page.getByRole('textbox', { name: '输入 JSON' }).fill(draft);
  await activate(page.getByRole('button', { name: '独立窗口打开JSON 格式化' }));
  await activate(page.getByRole('button', { name: '收起工具窗口' }));
  if (mobile) await activate(page.getByRole('link', { name: '返回发现' }));
  await activate(page.getByRole('link', { name: '游戏', exact: true }));
  await activate(page.getByRole('button', { name: '独立窗口打开人生重开模拟器' }));
  const game = page.getByRole('dialog', { name: '人生重开模拟器' });
  await expect(game).toBeVisible();
  await activate(game.getByRole('button', { name: '立即重开' }));
  await activate(game.getByRole('button', { name: '收起游戏窗口' }));
  await expect(page.getByRole('navigation', { name: '已打开的游戏' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '已打开的工具' })).toBeVisible();
  await activate(page.getByRole('button', { name: '继续JSON 格式化' }));
  const json = page.getByRole('dialog', { name: 'JSON 格式化' });
  await expect(json.getByRole('textbox', { name: '输入 JSON' })).toHaveValue(draft);
  await expect(game).toBeHidden();
  await activate(json.getByRole('button', { name: '关闭工具窗口' }));
  await activate(page.getByRole('button', { name: '继续人生重开模拟器' }));
  await expect(game.getByRole('heading', { name: '选择重开模式' })).toBeVisible();
  await activate(game.getByRole('button', { name: '关闭游戏窗口' }));
});
