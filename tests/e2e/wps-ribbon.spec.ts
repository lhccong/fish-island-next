import { expect, test } from '@playwright/test';
import { setup, noOverflow } from './fish-circle-fixture';

test('WPS ribbon keeps navigation usable at the top and preserves workspace state', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name.startsWith('mobile');
  const viewport = page.viewportSize()!;
  if (!testInfo.project.name.startsWith('mobile')) {
    await page.setViewportSize({ width: 1920, height: 1080 });
  }
  let requests = 0;
  await page.route('**/api/hot/list', (route) => {
    requests += 1;
    return route.fulfill({
      json: {
        code: 0,
        data: [
          {
            id: 'wps-test',
            name: '知乎热榜',
            categoryName: '综合资讯',
            data: [{ title: '顶部菜单验证', url: 'https://example.com/topic' }],
          },
        ],
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: '查看知乎热榜消息' }).click();
  const input = page.getByRole('textbox', { name: '消息输入框', exact: true, includeHidden: true });
  await input.fill('WPS 模式保留草稿');
  const requestCount = requests;
  if (mobile) await page.setViewportSize({ width: 1280, height: 900 });
  const trigger = page.getByRole('button', { name: '切换主题', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '主题模式' });
  await dialog.getByRole('button', { name: 'WPS 表格', exact: true }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(trigger).toBeFocused();
  if (mobile) await page.setViewportSize(viewport);
  await expect(input).toHaveValue('WPS 模式保留草稿');
  expect(requests).toBe(requestCount);
  const rail = page.getByRole('complementary', { name: '应用导航', exact: true });
  const bounds = await rail.boundingBox();
  if (mobile) expect(bounds!.y).toBeGreaterThan(viewport.height - 100);
  else expect(bounds!.y).toBe(0);
  expect(bounds!.width).toBe(page.viewportSize()!.width);
  const main = await page.locator('#main-content').boundingBox();
  if (mobile) expect(main!.y + main!.height).toBeLessThanOrEqual(bounds!.y + 1);
  else expect(main!.y).toBeGreaterThanOrEqual(bounds!.height);
  for (const name of ['聊天', '热榜', mobile ? '发现' : '鱼小圈']) {
    const link = page.getByRole('link', { name, exact: true });
    await expect(link).toBeVisible();
    const box = await link.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(
      testInfo.project.name.startsWith('mobile') ? 44 : 30,
    );
    if (!mobile) expect(box!.y).toBeLessThan(36);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
  await page.screenshot({ path: testInfo.outputPath('wps-ribbon.png'), fullPage: true });
  await rail.screenshot({ path: testInfo.outputPath('wps-toolbar.png') });
  await trigger.click();
  await dialog.getByRole('button', { name: '微信绿', exact: true }).click();
  await dialog.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(input).toHaveValue('WPS 模式保留草稿');
  if (mobile) await page.setViewportSize({ width: 1280, height: 900 });
  await trigger.click();
  await dialog.getByRole('button', { name: 'WPS 表格', exact: true }).click();
  await page.keyboard.press('Escape');
  if (mobile) await page.setViewportSize(viewport);
  await page.reload();
  await expect(page.locator('[data-navigation-layout="ribbon"]')).toBeVisible();
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '摸鱼岛', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  if (mobile) {
    await page.getByRole('link', { name: '发现', exact: true }).click();
    await page.getByRole('link', { name: '朋友圈', exact: true }).click();
  } else await page.getByRole('link', { name: '鱼小圈', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '摸鱼岛', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('WPS document tabs navigate between authenticated pages and follow browser history', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('fish-island:skin', 'wps'));
  await setup(page);
  if (testInfo.project.name.startsWith('mobile')) {
    const rail = page.getByRole('complementary', { name: '应用导航', exact: true });
    await expect(rail).toBeHidden();
    await page.getByRole('button', { name: '返回发现' }).click();
    await expect(rail).toBeVisible();
    await rail.getByRole('link', { name: '聊天', exact: true }).click();
    await expect(page).toHaveURL('/chat');
    await expect(rail).toBeHidden();
    await page.getByRole('link', { name: '返回热榜' }).click();
    await expect(rail).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL('/chat');
    await expect(rail).toBeHidden();
    await noOverflow(page);
    return;
  }
  const fishCircle = page.getByRole('link', { name: '鱼小圈', exact: true });
  const chat = page.getByRole('link', { name: '聊天', exact: true });
  const hot = page.getByRole('link', { name: '热榜', exact: true });
  await expect(fishCircle).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('article')).toBeVisible();
  await noOverflow(page);
  await chat.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/chat');
  await expect(chat).toHaveAttribute('aria-current', 'page');
  await expect(page.getByLabel('消息工作表列', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '鱼岛群聊', level: 1 })).toBeHidden();
  await noOverflow(page);
  await hot.click();
  await expect(page).toHaveURL('/');
  await expect(hot).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('暂时没有热榜内容', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(chat).toHaveAttribute('aria-current', 'page');
  await page.goBack();
  await expect(fishCircle).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('article')).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('wps-fish-circle-tabs.png'), fullPage: true });
});
