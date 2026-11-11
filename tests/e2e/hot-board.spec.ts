import { expect, test } from '@playwright/test';

const response = {
  code: 0,
  data: [
    {
      id: '1',
      name: '知乎热榜',
      categoryName: '综合资讯',
      updateTime: '2026-11-11T10:00:00+08:00',
      data: Array.from({ length: 12 }, (_, index) => ({
        title: `知乎热点 ${index + 1}`,
        url: `https://example.com/zhihu/${index}`,
        followerCount: 10000 + index,
      })),
    },
    {
      id: '2',
      name: '掘金热榜',
      categoryName: '技术编程',
      data: [{ title: 'React 性能优化', url: 'https://example.com/react' }],
    },
  ],
};

test('fixed cards scroll internally and open a conversation with demo composer', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/hot/list', (route) => route.fulfill({ json: response }));
  await page.goto('/');
  const zhihu = page.getByRole('region', { name: '知乎热榜', exact: true });
  await expect(zhihu).toBeVisible();
  await expect(zhihu.getByRole('link')).toHaveCount(12);
  await expect(page.getByRole('searchbox', { name: '搜索热榜内容' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '刷新热榜', exact: true })).toHaveCount(0);
  const cardScroll = page.getByRole('region', { name: '知乎热榜榜单滚动区', exact: true });
  await cardScroll.focus();
  await cardScroll.press('End');
  await expect.poll(() => cardScroll.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const cardHeight = await zhihu.evaluate((element) => element.getBoundingClientRect().height);
  const otherHeight = await page
    .getByRole('region', { name: '掘金热榜', exact: true })
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(cardHeight).toBe(otherHeight);
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByRole('dialog').getByRole('checkbox', { name: '掘金热榜', exact: true }).uncheck();
  await page.getByRole('dialog').getByRole('button', { name: '关闭', exact: true }).click();
  await expect(page.getByRole('region', { name: '掘金热榜', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByRole('button', { name: '恢复全部来源', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '关闭', exact: true }).click();
  await expect(page.getByRole('region', { name: '掘金热榜', exact: true })).toBeVisible();
  await zhihu.getByRole('button', { name: '查看知乎热榜消息' }).click();
  const conversation = page.getByRole('region', { name: '知乎热榜消息', exact: true });
  await expect(conversation.getByRole('article')).toHaveCount(12);
  await expect(conversation.getByRole('link').first()).toHaveText('知乎热点 1');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '摸鱼岛', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '关闭登录弹窗', exact: true }).click();
  await expect(conversation).toBeVisible();
  await expect(conversation.getByRole('link').first()).toHaveAttribute(
    'rel',
    'noopener noreferrer',
  );
  const input = page.getByRole('textbox', { name: '消息输入框' });
  await input.fill('只测试界面，不发送');
  await expect(input).toHaveValue('只测试界面，不发送');
  await expect(page.getByRole('button', { name: '发送', exact: true })).toBeDisabled();
  await expect(page.getByText('界面演示，不会发送', { exact: true })).toHaveCount(0);
  const viewport = page.getByRole('region', { name: '主内容滚动区', exact: true });
  await viewport.focus();
  await viewport.press('End');
  await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const composer = page.getByRole('region', { name: '消息输入区', exact: true });
  const bounds = await composer.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.screenshot({ path: testInfo.outputPath('conversation.png'), fullPage: true });
  await page.getByRole('button', { name: '返回全部热榜' }).click();
  await expect(zhihu).toBeVisible();
  await expect(input).toHaveCount(0);
  await page.getByRole('button', { name: '技术编程', exact: true }).click();
  await expect(zhihu).toHaveCount(0);
  await page.getByRole('button', { name: '全部', exact: true }).click();
  if (testInfo.project.name.startsWith('mobile')) {
    await expect(page.getByRole('complementary', { name: '热榜来源', exact: true })).toBeHidden();
    const trigger = page.getByRole('button', { name: '热榜来源：全部热榜', exact: true });
    await expect(page.getByRole('heading').filter({ has: trigger })).toBeVisible();
    await trigger.click();
    const picker = page.getByRole('dialog', { name: '选择热榜来源', exact: true });
    await expect(picker).toBeVisible();
    await picker.getByRole('textbox', { name: '搜索可选热榜来源' }).fill('不存在的来源');
    await expect(picker).toContainText('没有匹配的来源');
    await picker.getByRole('textbox', { name: '搜索可选热榜来源' }).fill('知乎');
    await picker.getByRole('button', { name: '知乎热榜', exact: true }).click();
    await expect(picker).toHaveCount(0);
    const selectedTrigger = page.getByRole('button', { name: '热榜来源：知乎热榜', exact: true });
    await expect(page.getByRole('heading').filter({ has: selectedTrigger })).toBeVisible();
    await expect(selectedTrigger).toBeFocused();
    await selectedTrigger.click();
    await expect(picker.getByRole('button', { name: '知乎热榜', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await picker.getByRole('button', { name: '关闭来源选择' }).click();
    await expect(selectedTrigger).toBeFocused();
  } else
    await page
      .getByRole('navigation', { name: '选择热榜来源' })
      .getByRole('button', { name: /知乎热榜/ })
      .click();
  await expect(conversation).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('mobile source picker keeps long lists inside its panel', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile source picker');
  await page.route('**/api/hot/list', (route) =>
    route.fulfill({
      json: {
        code: 0,
        data: Array.from({ length: 24 }, (_, index) => ({
          ...response.data[0],
          id: String(index + 1),
          name: `来源 ${index + 1}`,
        })),
      },
    }),
  );
  await page.goto('/');
  const trigger = page.getByRole('button', { name: '热榜来源：全部热榜', exact: true });
  await trigger.click();
  const panel = page.getByRole('dialog', { name: '选择热榜来源', exact: true });
  await expect(panel.getByRole('button', { name: '来源 24', exact: true })).toBeAttached();
  const region = panel.getByRole('region', { name: '可选热榜来源' });
  await region.focus();
  await region.press('End');
  await expect.poll(() => region.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const bounds = await panel.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
  });
  expect(bounds.top).toBeGreaterThanOrEqual(0);
  expect(bounds.bottom).toBeLessThanOrEqual(page.viewportSize()!.height);
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: testInfo.outputPath('source-picker.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('handles initial failure, retry and empty data', async ({ page }) => {
  let fail = true;
  await page.route('**/api/hot/list', (route) =>
    route.fulfill({ json: fail ? { code: 500, message: '服务维护' } : { code: 0, data: [] } }),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('服务维护');
  fail = false;
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect(page.getByRole('heading', { name: '暂时没有热榜内容' })).toBeVisible();
  await page.getByRole('link', { name: '聊天', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '摸鱼岛', exact: true })).toBeVisible();
});
