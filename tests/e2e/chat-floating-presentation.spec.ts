import { expect, test, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { openMessageActions } from './chat-message-actions';
import { scrollChatUp } from './chat-scroll-actions';

test.setTimeout(90000);

async function enterWindow(page: Page, classic: boolean) {
  const entry = page.getByRole('button', { name: '小窗模式', exact: true });
  if (classic || !(await entry.isVisible()))
    await page.getByRole('button', { name: '更多聊天工具', exact: true }).click();
  if (classic) await page.getByRole('menuitem', { name: '小窗模式', exact: true }).click();
  else await entry.click();
  await expect(page).toHaveURL('/');
}

async function chooseMode(page: Page, label: string) {
  const select = page.getByRole('combobox', { name: '小窗显示模式', exact: true });
  if (page.viewportSize()!.width <= 760) await select.tap();
  else await select.click();
  const option = page.getByRole('option', { name: label, exact: true });
  await expect(option).toBeInViewport();
  if (page.viewportSize()!.width <= 760) await option.tap();
  else await option.click();
  await expect(select).toBeFocused();
  await expect(select).toHaveText(label);
}

async function assertLayout(page: Page) {
  for (const area of [
    page.getByRole('dialog').filter({ has: page.getByRole('button', { name: '关闭聊天窗口' }) }),
    page.getByRole('region', { name: '群聊输入区', exact: true }),
    page.getByRole('region', { name: '群聊消息区', exact: true }),
    ...((await page.locator('article[data-message-id]').all()) ?? []),
  ]) {
    expect(await area.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('textbox', { name: '消息草稿', exact: true })).toBeInViewport();
  await expect(page.getByRole('button', { name: '关闭聊天窗口', exact: true })).toBeInViewport();
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: floating Excel modes, states and preserved chat`, async ({
      page,
    }, info) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      let requests = 0;
      let loadingRetries = 0;
      let waitingForHistory = true;
      let dispose: (() => void) | undefined;
      try {
        const setup = setupChatMenu(
          page,
          skin.id,
          mode,
          'user',
          async () => {
            await page.route('**/api/chat/message/page/vo', async (route) => {
              requests++;
              if (waitingForHistory) {
                await pending;
                await route.fulfill({ status: 503 }).catch((error: unknown) => {
                  if (!route.request().failure()) throw error;
                });
              } else await route.fulfill({ json: { code: 0, data: { records: [] } } });
            });
          },
          false,
        ).then((fixture) => {
          dispose = fixture.dispose;
          return fixture;
        });
        await expect(page.getByText('正在加载历史消息…', { exact: true })).toBeVisible({
          timeout: 30000,
        });
        await enterWindow(page, skin.id === 'moyu-island');
        const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
        await draft.fill('切换 Excel 模式时保留的草稿');
        const originalEditor = await draft.elementHandle();
        const scroll = page.getByRole('region', { name: '群聊消息区', exact: true });
        const originalScroll = await scroll.elementHandle();
        await chooseMode(page, 'Excel 模式');
        const select = page.getByRole('combobox', { name: '小窗显示模式', exact: true });
        const columns = page.getByLabel('消息工作表列', { exact: true });
        await expect(columns).toBeVisible();
        await expect(page.getByRole('dialog', { name: /\.xlsx — Excel$/ })).toBeVisible();
        const loading = page.getByRole('status').filter({ hasText: '正在加载历史消息…' });
        const retry = page.getByRole('button', { name: '重试历史消息', exact: true });
        await expect(async () => {
          if (await retry.isVisible()) {
            loadingRetries++;
            await retry.click();
          }
          await expect(loading.locator('svg')).toBeVisible({ timeout: 1000 });
        }).toPass({ timeout: 15000 });
        await assertLayout(page);
        await page.screenshot({ path: info.outputPath('excel-loading.png') });
        waitingForHistory = false;
        release();
        await expect(retry).toBeVisible();
        await chooseMode(page, '聊天气泡');
        await expect(columns).toHaveCount(0);
        await expect(retry).toBeVisible();
        await chooseMode(page, 'Excel 模式');
        await assertLayout(page);
        await page.screenshot({ path: info.outputPath('excel-error.png') });
        await retry.click();
        const fixture = await setup;
        await expect(page.getByText('暂无消息，连接后将在这里接收新消息')).toBeVisible();
        await expect(page.getByRole('button', { name: '发送', exact: true })).toBeEnabled();
        await page.screenshot({ path: info.outputPath('excel-empty.png') });
        fixture.broadcast({
          id: '1',
          bubbleId: 'berry-cat-paw',
          content: 'Excel 单元格中的长文本 ' + 'https://example.com/长链接'.repeat(8),
          sender: { id: '456', name: '合成岛友' },
          timestamp: Date.now(),
        });
        const styledBubble = page.locator('[data-message-id="1"]').getByRole('group');
        await expect(styledBubble).toHaveAttribute('data-bubble-style', 'berry-cat-paw');
        await expect(styledBubble).toHaveCSS('border-image-source', /^url\(/);
        await assertLayout(page);
        fixture.push('2', '[img]https://menu.test/image.png[/img]');
        await page.getByRole('button', { name: '展开单元格图片', exact: true }).click();
        await expect(page.getByRole('button', { name: '放大聊天图片', exact: true })).toBeVisible();
        fixture.broadcast({
          id: '3',
          bubbleId: 'berry-cat-paw',
          content: '本人合成消息',
          sender: { id: '123', name: '本人合成' },
          timestamp: Date.now(),
        });
        const selfBubble = page.locator('[data-message-id="3"]').getByRole('group');
        await expect(selfBubble).toBeInViewport();
        const menu = await openMessageActions(page, '3');
        await menu.getByRole('menuitem', { name: '引用', exact: true }).click();
        await expect(page.getByRole('region', { name: '引用消息', exact: true })).toBeVisible();
        await chooseMode(page, '聊天气泡');
        await expect(selfBubble).toHaveAttribute('data-bubble-style', 'berry-cat-paw');
        await expect(draft).toHaveText('切换 Excel 模式时保留的草稿');
        await expect(page.getByRole('region', { name: '引用消息', exact: true })).toBeVisible();
        await chooseMode(page, 'Excel 模式');
        await page.getByRole('button', { name: '取消引用', exact: true }).click();
        let sends = 0;
        await page.route('**/api/chat/message/send', (route) => {
          sends++;
          if (sends === 1) return route.fulfill({ status: 503 });
          const data = route.request().postDataJSON() as {
            content: string;
            clientMessageId: string;
          };
          return route.fulfill({
            json: {
              code: 0,
              data: {
                message: {
                  id: '4',
                  ...data,
                  sender: { id: '123', name: '本人合成' },
                  timestamp: Date.now(),
                },
              },
            },
          });
        });
        await page.getByRole('button', { name: '发送', exact: true }).click();
        const retrySend = page.getByRole('button', { name: '重试发送', exact: true });
        await expect(retrySend).toBeVisible();
        await draft.fill('发送失败后继续编辑的草稿');
        await assertLayout(page);
        await page.screenshot({ path: info.outputPath('excel-send-error.png') });
        await retrySend.click();
        await expect(page.locator('[data-message-id="4"]')).toBeVisible();
        await expect(retrySend).toHaveCount(0);
        await scroll.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        for (let index = 5; index <= 30; index++)
          fixture.push(String(index), `滚动合成消息 ${index}`);
        await expect(page.getByLabel('输入单元格', { exact: true })).toHaveText('C31');
        const latest = page.getByRole('button', { name: '查看最新消息', exact: true });
        await Promise.any([
          expect(page.locator('[data-message-id="30"]')).toBeInViewport(),
          expect(latest).toBeVisible(),
        ]);
        if (await latest.isVisible()) await latest.click();
        await expect(page.locator('[data-message-id="30"]')).toBeInViewport();
        await scroll.hover();
        const mobile = page.viewportSize()!.width <= 760;
        await scrollChatUp(page, scroll);
        await scroll.evaluate((el) => {
          el.scrollTop = 0;
        });
        await expect(page.locator('[data-message-id="1"]')).toBeInViewport();
        await expect(page.getByText('历史消息已全部加载', { exact: true })).toBeVisible();
        const scrollbar = scroll.locator('..').locator('[data-orientation="vertical"]');
        if (mobile) await expect(scrollbar).toBeHidden();
        else await expect(scrollbar).toBeVisible();
        await chooseMode(page, '聊天气泡');
        await chooseMode(page, 'Excel 模式');
        await expect(page.getByRole('button', { name: '查看最新消息', exact: true })).toBeVisible();
        await page.getByRole('button', { name: '查看最新消息', exact: true }).click();
        await expect(page.locator('[data-message-id="30"]')).toBeInViewport();
        await assertLayout(page);
        await page.screenshot({ path: info.outputPath('excel-success.png') });
        const scrollBox = (await scroll.boundingBox())!;
        const lastBox = (await page.locator('[data-message-id="30"]').boundingBox())!;
        expect(scrollBox.x + scrollBox.width - lastBox.x - lastBox.width).toBeGreaterThanOrEqual(
          mobile ? 20 : 24,
        );
        // Esc closes only the selection and returns focus, leaving the chat open.
        await select.press('Enter');
        await expect(page.getByRole('listbox')).toBeVisible();
        await page.screenshot({ path: info.outputPath('mode-options.png') });
        await page.keyboard.press('Escape');
        await expect(select).toBeFocused();
        await expect(columns).toBeVisible();
        if (!mobile) {
          await page.getByRole('button', { name: '最大化聊天窗口', exact: true }).click();
          await assertLayout(page);
          await page.getByRole('button', { name: '还原聊天窗口', exact: true }).click();
          await assertLayout(page);
        }
        await page.getByRole('button', { name: '收起聊天窗口', exact: true }).click();
        await page.getByRole('button', { name: '恢复聊天小窗', exact: true }).click();
        await expect(select).toHaveText('Excel 模式');
        await expect(draft).toHaveText('发送失败后继续编辑的草稿');
        expect(await draft.evaluate((el, original) => el === original, originalEditor)).toBe(true);
        expect(await scroll.evaluate((el, original) => el === original, originalScroll)).toBe(true);
        await page.getByRole('button', { name: '关闭聊天窗口', exact: true }).click();
        await expect(page).toHaveURL('/chat');
        await expect(columns).toHaveCount(skin.id === 'wps' ? 1 : 0);
        await enterWindow(page, skin.id === 'moyu-island');
        await expect(select).toHaveText('Excel 模式');
        expect(fixture.stats().connections).toBe(1);
        expect(requests).toBe(loadingRetries + 2);
        expect(errors).toEqual([]);
        await originalEditor?.dispose();
        await originalScroll?.dispose();
      } finally {
        release();
        dispose?.();
      }
    });
  }
