import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test('floating Excel choice, mounted editor and connection survive every theme and mode', async ({
  page,
}) => {
  test.setTimeout(90000);
  const fixture = await setupChatMenu(page, 'wps', 'light');
  const entry = page.getByRole('button', { name: '小窗模式', exact: true });
  if (!(await entry.isVisible())) await page.getByRole('button', { name: '更多聊天工具' }).click();
  await entry.click();
  const select = page.getByRole('combobox', { name: '小窗显示模式', exact: true });
  await select.click();
  await page.getByRole('option', { name: 'Excel 模式', exact: true }).click();
  const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
  await draft.fill('主题切换保留的 Excel 草稿');
  const editor = await draft.elementHandle();
  await page.getByRole('button', { name: '收起聊天窗口' }).click();
  await page.getByRole('link', { name: '聊天', exact: true }).click();
  await page.getByRole('button', { name: '切换主题', exact: true }).click();
  const picker = page.getByRole('dialog', { name: '主题模式', exact: true });
  for (const skin of builtinSkins) {
    await picker.getByRole('button', { name: skin.name, exact: true }).click();
    for (const mode of ['暗夜模式', '明亮模式']) {
      await picker.getByRole('button', { name: mode, exact: true }).click();
      expect(await editor!.evaluate((el) => el.isConnected)).toBe(true);
      expect(fixture.stats()).toMatchObject({ connections: 1, historyRequests: 1 });
    }
  }
  await picker.getByRole('button', { name: '关闭主题弹窗', exact: true }).click();
  await page.getByRole('button', { name: '恢复聊天小窗' }).click();
  await expect(select).toHaveText('Excel 模式');
  await expect(draft).toHaveText('主题切换保留的 Excel 草稿');
  expect(await draft.evaluate((el, original) => el === original, editor)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await editor?.dispose();
});
