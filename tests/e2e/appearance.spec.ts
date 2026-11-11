import { expect, test } from '@playwright/test';

const response = {
  code: 0,
  data: [
    {
      id: '1',
      name: '知乎热榜',
      categoryName: '综合资讯',
      data: [{ title: '主题切换测试', url: 'https://example.com/topic' }],
    },
  ],
};

test('switches the workspace theme without losing content and restores after reload', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/hot/list', (route) => route.fulfill({ json: response }));
  await page.goto('/');
  await page.getByRole('button', { name: '查看知乎热榜消息' }).click();
  const input = page.getByRole('textbox', { name: '消息输入框', exact: true });
  await input.fill('切换主题时保留草稿');
  const trigger = page.getByRole('button', { name: '切换主题', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '主题模式' });
  await dialog.getByRole('button', { name: '企业微信', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'wecom');
  await expect(dialog.getByRole('button', { name: '企业微信' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.screenshot({ path: testInfo.outputPath('theme-picker.png'), fullPage: true });
  expect(
    await page
      .locator('html')
      .evaluate((root) => getComputedStyle(root).getPropertyValue('--color-accent').trim()),
  ).toBe('#2678df');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(input).toHaveValue('切换主题时保留草稿');
  await expect(page.getByRole('region', { name: '知乎热榜消息', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'wecom');
  await trigger.click();
  await dialog.getByRole('button', { name: '微信绿' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-skin', 'wechat');
  expect(
    await page
      .locator('html')
      .evaluate((root) => getComputedStyle(root).getPropertyValue('--color-sidebar').trim()),
  ).toBe('#e8e8e8');
  await dialog.getByRole('button', { name: '企业微信' }).click();
  await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('wecom-workspace.png'), fullPage: true });
});

for (const state of ['loading', 'empty', 'error'] as const) {
  test(`theme entry stays usable with ${state} hot boards`, async ({ page }) => {
    await page.route('**/api/hot/list', async (route) => {
      if (state === 'loading') return;
      if (state === 'error') await route.fulfill({ status: 500, body: 'unavailable' });
      else await route.fulfill({ json: { code: 0, data: [] } });
    });
    await page.goto('/');
    if (state === 'loading') await expect(page.getByRole('status')).toContainText('正在获取');
    if (state === 'empty')
      await expect(page.getByText('暂时没有热榜内容', { exact: true })).toBeVisible();
    if (state === 'error') await expect(page.getByRole('alert')).toBeVisible();
    await page.getByRole('button', { name: '切换主题', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '主题模式' });
    for (const [name, id] of [
      ['飞书蓝', 'feishu'],
      ['钉钉蓝', 'dingtalk'],
      ['WPS 表格', 'wps'],
    ]) {
      await dialog.getByRole('button', { name, exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-skin', id);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  });
}

for (const theme of [
  {
    id: 'feishu',
    name: '飞书蓝',
    incoming: 'rgb(237, 240, 247)',
    outgoing: 'rgb(220, 229, 255)',
    rail: 'rgb(228, 233, 245)',
    railActive: 'rgb(212, 221, 240)',
    sidebar: 'rgb(240, 242, 248)',
    hover: 'rgb(226, 232, 245)',
  },
  {
    id: 'dingtalk',
    name: '钉钉蓝',
    incoming: 'rgb(232, 240, 247)',
    outgoing: 'rgb(204, 232, 255)',
    rail: 'rgb(223, 234, 245)',
    railActive: 'rgb(203, 223, 238)',
    sidebar: 'rgb(237, 244, 250)',
    hover: 'rgb(220, 234, 245)',
  },
]) {
  test(`${theme.id} synchronizes bubble colors, tails and previews`, async ({ page }, testInfo) => {
    await page.route('**/api/hot/list', (route) => route.fulfill({ json: response }));
    await page.goto('/');
    await page.getByRole('button', { name: '查看知乎热榜消息' }).click();
    const input = page.getByRole('textbox', { name: '消息输入框', exact: true });
    await input.fill('换肤保留草稿');
    const trigger = page.getByRole('button', { name: '切换主题', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: '主题模式' });
    const option = dialog.getByRole('button', { name: theme.name, exact: true });
    // Each preview must render its own palette even before selecting the theme.
    await expect(option.locator('[class*="incoming"]')).toHaveCSS(
      'background-color',
      theme.incoming,
    );
    await expect(option.locator('[class*="outgoing"]')).toHaveCSS(
      'background-color',
      theme.outgoing,
    );
    await option.click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', theme.id);
    await dialog.getByRole('button', { name: '关闭', exact: true }).click();
    await expect(trigger).toBeFocused();
    await expect(input).toHaveValue('换肤保留草稿');
    const incoming = page.getByRole('article').first().locator('div').first();
    const outgoing = page.getByText('看看今天的热榜', { exact: true });
    await expect(incoming).toHaveCSS('background-color', theme.incoming);
    await expect(outgoing).toHaveCSS('background-color', theme.outgoing);
    expect(await incoming.evaluate((el) => getComputedStyle(el, '::before').backgroundColor)).toBe(
      theme.incoming,
    );
    expect(await outgoing.evaluate((el) => getComputedStyle(el, '::after').backgroundColor)).toBe(
      theme.outgoing,
    );
    await expect(page.getByRole('complementary', { name: '应用导航', exact: true })).toHaveCSS(
      'background-color',
      theme.rail,
    );
    const sidebar = page.getByRole('complementary', { name: '热榜来源', exact: true });
    if (!testInfo.project.name.startsWith('mobile')) {
      await expect(sidebar).toHaveCSS('background-color', theme.sidebar);
      await trigger.hover();
      await expect(trigger).toHaveCSS('background-color', theme.railActive);
      const overview = sidebar.getByRole('button', { name: /全部热榜/ });
      await overview.hover();
      await expect(overview).toHaveCSS('background-color', theme.hover);
    }
    await page.screenshot({
      path: testInfo.outputPath(`${theme.id}-conversation.png`),
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-skin', theme.id);
    await page.getByRole('button', { name: '查看知乎热榜消息' }).click();
    await expect(outgoing).toHaveCSS('background-color', theme.outgoing);
    await trigger.click();
    await dialog.getByRole('button', { name: '微信绿', exact: true }).click();
    await dialog.getByRole('button', { name: '关闭', exact: true }).click();
    await expect(outgoing).toHaveCSS('background-color', 'rgb(149, 236, 105)');
    await expect(incoming).toHaveCSS('background-color', 'rgb(237, 237, 237)');
  });
}
