import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setup, noOverflow } from './fish-circle-fixture';

test('theme and mode changes preserve notification page without requests', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await setup(page, false, { visual: true });
  let requests = 0;
  await page.route('**/api/event_remind/**', (route) => {
    requests++;
    if (route.request().url().endsWith('/count'))
      return route.fulfill({ json: { code: 0, data: 2 } });
    const current = route.request().postDataJSON().current;
    return route.fulfill({
      json: {
        code: 0,
        data: {
          total: 2,
          records: [
            {
              id: String(current),
              state: 0,
              action: 'like',
              sourceType: 4,
              sourceId: '1001',
              senderUser: { userName: '换肤测试岛友' },
              sourceContent: '海边的新鲜事',
            },
          ],
        },
      },
    });
  });
  await page.getByRole('button', { name: '消息通知', exact: true }).click();
  const panel = page.getByRole('dialog', { name: '全部互动消息', exact: true });
  await expect(panel.getByText('换肤测试岛友', { exact: true }).first()).toBeVisible();
  await panel.locator('[data-scroll-pagination="通知"]').scrollIntoViewIfNeeded();
  await expect(
    panel.locator('[data-scroll-pagination="通知"]').getByText('已全部加载'),
  ).toBeVisible();
  await expect(panel.getByText('换肤测试岛友', { exact: true }).first()).toBeVisible();
  await page.keyboard.press('Escape');
  const before = requests;
  for (const skin of builtinSkins)
    for (const mode of ['light', 'dark']) {
      await page.getByRole('button', { name: '切换主题', exact: true }).click();
      const picker = page.getByRole('dialog', { name: '主题模式' });
      await picker.getByRole('button', { name: skin.name, exact: true }).click();
      await picker
        .getByRole('button', { name: mode === 'light' ? '明亮模式' : '暗夜模式', exact: true })
        .click();
      await picker.getByRole('button', { name: '关闭', exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
      const cover = page.getByRole('region', { name: '鱼小圈封面', exact: true });
      await cover.getByRole('button', { name: '发布动态', exact: true }).focus();
      await expect(cover.getByRole('button', { name: '发布动态', exact: true })).toBeFocused();
      if (!page.isClosed())
        await page.screenshot({ path: info.outputPath(`cover-${skin.id}-${mode}.png`) });
      await noOverflow(page);
      expect(requests).toBe(before);
    }
  await page.getByRole('button', { name: '消息通知', exact: true }).click();
  await expect(
    panel.locator('[data-scroll-pagination="通知"]').getByText('已全部加载'),
  ).toBeVisible();
});
