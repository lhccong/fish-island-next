import { expect, test } from '@playwright/test';
import { setupChatMenu } from './chat-menu-fixture';

test('floating Excel keeps upward history paging, retry and anchors', async ({ page }) => {
  test.setTimeout(60000);
  let requests = 0;
  let failOlder = true;
  const setup = setupChatMenu(
    page,
    'wechat',
    'dark',
    'user',
    async () => {
      await page.route('**/api/chat/message/page/vo', (route) => {
        requests++;
        const body = route.request().postDataJSON() as { current?: number; messageId?: string };
        if (body.messageId === '51' && failOlder) {
          failOlder = false;
          return route.fulfill({ status: 503 });
        }
        const last = body.current === 1 ? 100 : body.messageId === '51' ? 50 : 0;
        const records = last
          ? Array.from({ length: 50 }, (_, index) => ({
              messageWrapper: {
                message: {
                  id: String(last - index),
                  content: `合成历史单元格 ${last - index}`,
                  sender: { id: '456', name: '合成岛友' },
                  timestamp: 1794441600000 + last - index,
                },
              },
            }))
          : [];
        return route.fulfill({ json: { code: 0, data: { records } } });
      });
    },
    false,
  );
  const fixture = await setup;
  await expect(page.locator('[data-message-id="100"]')).toBeInViewport();
  const entry = page.getByRole('button', { name: '小窗模式', exact: true });
  if (!(await entry.isVisible())) await page.getByRole('button', { name: '更多聊天工具' }).click();
  await entry.click();
  const select = page.getByRole('combobox', { name: '小窗显示模式', exact: true });
  await select.click();
  await page.getByRole('option', { name: 'Excel 模式', exact: true }).click();
  const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
  await draft.fill('续载历史时保留的草稿');
  const scroll = page.getByRole('region', { name: '群聊消息区', exact: true });
  await scroll.evaluate((el) => {
    el.scrollTop = 0;
  });
  const retry = page.getByRole('button', { name: '重试历史消息', exact: true });
  await expect(retry).toBeVisible();
  await expect(page.locator('[data-message-id="51"]')).toBeInViewport();
  await retry.click();
  await expect(page.getByText('上滑查看更早消息', { exact: true })).toBeVisible();
  await expect(page.locator('[data-message-id="51"]')).toBeInViewport();
  await scroll.evaluate((el) => {
    el.scrollTop = 0;
  });
  await expect(page.getByText('历史消息已全部加载', { exact: true })).toBeVisible();
  await expect(page.locator('[data-message-id="1"]')).toBeInViewport();
  await expect(draft).toHaveText('续载历史时保留的草稿');
  await select.click();
  await page.getByRole('option', { name: '聊天气泡', exact: true }).click();
  await select.click();
  await page.getByRole('option', { name: 'Excel 模式', exact: true }).click();
  await expect(draft).toHaveText('续载历史时保留的草稿');
  expect(requests).toBe(4);
  expect(fixture.stats().connections).toBe(1);
  expect(await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});
