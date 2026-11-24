import { expect, test, type Page } from '@playwright/test';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(90_000);
for (const mode of ['light', 'dark'])
  test(`classic ${mode}: menus use centered content and about defaults to reward`, async ({
    page,
  }, info) => {
    await setupChatMenu(page, 'moyu-island', mode, 'admin');
    const mobile = page.viewportSize()!.width <= 760;
    await expect(page.locator('[data-navigation-layout="topbar"]')).toHaveAttribute(
      'data-sidebar-hidden',
      'false',
    );
    const nav = page.getByRole('navigation', { name: '主要功能', exact: true });
    await expect(nav.getByRole('link', { name: '玩法', exact: true })).toHaveCount(0);
    if (!mobile) {
      await expect(nav.getByRole('link', { name: '工具', exact: true })).toHaveAttribute(
        'href',
        '/utils/json',
      );
      await nav.getByRole('link', { name: '关于', exact: true }).click();
      await expect(page).toHaveURL(/\/rank\/reward$/);
    } else await page.goto('/rank/reward');
    await expect(
      page.getByRole('link', { name: '赞助榜', exact: true }).filter({ visible: true }),
    ).toHaveAttribute('aria-current', 'page');
    for (const path of [
      '/reader',
      '/pet',
      '/discover/games',
      '/utils/avatar-frames',
      '/utils/json',
      '/moments/fish-circle',
      '/rank/reward',
    ]) {
      await page.goto(path);
      const shell = page.locator('[data-navigation-layout="topbar"]').filter({ visible: true });
      await expect(shell).toHaveAttribute('data-sidebar-hidden', 'true');
      await expect(shell).toHaveAttribute('data-content-centered', 'true');
      const workspace = page.locator('#main-content').locator('..');
      if (!mobile) {
        await expect(workspace).toHaveCSS('border-radius', '0px');
        await expect(workspace).toHaveCSS('box-shadow', 'none');
        await expect(workspace).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        const box = (await workspace.boundingBox())!;
        expect(box.y).toBe(52);
        expect(box.y + box.height).toBe(page.viewportSize()!.height);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (path === '/reader' || path === '/rank/reward')
        await page.screenshot({
          path: info.outputPath(`${path.slice(1).replaceAll('/', '-')}-${mode}.png`),
          scale: 'css',
        });
    }
    await page.goto('/admin/user');
    await expect(page.locator('[data-navigation-layout="topbar"]')).toHaveAttribute(
      'data-sidebar-hidden',
      'false',
    );
    if (!mobile)
      await expect(
        page.getByRole('complementary', { name: '管理导航', exact: true }),
      ).toBeVisible();
  });

async function expectCenteredSidebar(page: Page) {
  const rail = page.getByRole('complementary', { name: '应用导航', exact: true });
  const current = rail.getByRole('link', { name: '聊天', exact: true });
  await expect(current).toHaveAttribute('aria-current', 'page');
  const menuBounds = (await current.boundingBox())!;
  const railBounds = (await rail.boundingBox())!;
  const avatar = (await rail.getByRole('button', { name: '用户菜单', exact: true }).boundingBox())!;
  const theme = (await rail.getByRole('button', { name: '切换主题', exact: true }).boundingBox())!;
  const centerX = railBounds.x + railBounds.width / 2;
  expect(Math.abs(menuBounds.x + menuBounds.width / 2 - centerX)).toBeLessThanOrEqual(1);
  expect(menuBounds.width / railBounds.width).toBeGreaterThan(0.75);
  expect(avatar.x + avatar.width).toBeLessThan(centerX);
  expect(theme.x).toBeGreaterThan(centerX);
  expect(avatar.y + avatar.height / 2).toBeCloseTo(theme.y + theme.height / 2, 1);
  expect(railBounds.y + railBounds.height - avatar.y - avatar.height).toBeLessThanOrEqual(16);
}

async function expectSidebarGroups(page: Page) {
  const nav = page.getByRole('navigation', { name: '主要功能', exact: true });
  const circle = nav.getByRole('link', { name: '鱼小圈', exact: true });
  const badge = circle.getByLabel('105 条未读通知');
  await expect(badge).toHaveText('99+');
  const circleBox = (await circle.boundingBox())!;
  const badgeBox = (await badge.boundingBox())!;
  const labelBox = (await circle.getByText('鱼小圈', { exact: true }).boundingBox())!;
  expect(badgeBox.x).toBeGreaterThan(labelBox.x + labelBox.width);
  expect(badgeBox.x + badgeBox.width).toBeLessThan(circleBox.x + circleBox.width);
  expect(badgeBox.y + badgeBox.height / 2).toBeCloseTo(circleBox.y + circleBox.height / 2, 1);

  const row = (name: string) => nav.getByRole('link', { name, exact: true }).boundingBox();
  const chat = (await row('聊天'))!;
  const reading = (await row('阅读'))!;
  const achievements = (await row('成就'))!;
  const about = (await row('关于'))!;
  const itemGap = circleBox.y - chat.y - chat.height;
  expect(reading.y - circleBox.y - circleBox.height).toBeGreaterThan(itemGap + 8);
  expect(about.y - achievements.y - achievements.height).toBeGreaterThan(itemGap + 8);
  expect(circleBox.height).toBeGreaterThanOrEqual(44);
}

async function expectWideSideChat(page: Page) {
  const circle = page.locator('#classic-circle-sidebar');
  const chat = page.locator('#main-content').locator('..');
  const picker = page.getByRole('combobox', { name: '调整鱼小圈布局' });
  const expectRightGutter = async (element: typeof chat) => {
    const bounds = (await element.boundingBox())!;
    expect(page.viewportSize()!.width - bounds.x - bounds.width).toBeCloseTo(32, 0);
  };

  await expect(circle).toBeVisible();
  await expectRightGutter(chat);
  await picker.click();
  await page.getByRole('option', { name: '聊天室右侧' }).click();
  await expectRightGutter(circle);
  const main = (await chat.boundingBox())!;
  expect(main.x + main.width).toBeLessThan((await circle.boundingBox())!.x);

  await circle.getByRole('button', { name: '收起鱼小圈', exact: true }).click();
  await expect(circle).toBeHidden();
  await expectRightGutter(chat);
  expect((await chat.boundingBox())!.width).toBeGreaterThan(main.width);
  await page.getByRole('button', { name: '展开鱼小圈', exact: true }).click();
  await picker.click();
  await page.getByRole('option', { name: '聊天室左侧' }).click();
  await expectRightGutter(chat);
}

test('classic side menu keeps its position across theme and mode changes', async ({
  page,
}, info) => {
  const browserSize = page.viewportSize()!;
  const mobile = browserSize.width <= 760;
  const fixture = await setupChatMenu(page, 'moyu-island', 'light', 'admin', async () => {
    await page.addInitScript(() => {
      localStorage.setItem('fish-island:tab-identity', JSON.stringify({ menuPosition: 'side' }));
    });
    await page.route('**/api/event_remind/my/unread/count', (route) =>
      route.fulfill({ json: { code: 0, data: 105 } }),
    );
  });
  const shell = page.locator('[data-navigation-layout]').filter({ visible: true });
  if (!mobile) {
    await expectCenteredSidebar(page);
    await expectSidebarGroups(page);
    await page.setViewportSize({ width: 1920, height: 908 });
    await expectWideSideChat(page);
    await page.screenshot({ path: info.outputPath('sidebar-light.png'), scale: 'css' });
  }
  await page.getByRole('button', { name: '切换主题', exact: true }).click();
  const theme = page.getByRole('dialog', { name: '主题模式' });
  await theme.getByRole('button', { name: '微信绿', exact: true }).click();
  await expect(shell).toHaveAttribute('data-navigation-layout', 'rail');
  await theme.getByRole('button', { name: '暗夜模式', exact: true }).click();
  await theme.getByRole('button', { name: '摸鱼岛', exact: true }).click();
  await expect(shell).toHaveAttribute('data-navigation-layout', 'side');
  await expect(page.locator('html')).toHaveAttribute('data-color-mode', 'dark');
  await theme.getByRole('button', { name: '关闭', exact: true }).click();

  if (mobile) {
    await page.getByRole('link', { name: '返回热榜', exact: true }).tap();
    const avatar = page.getByRole('button', { name: '用户菜单', exact: true });
    await avatar.tap();
    await expect(page.getByRole('menu', { name: '用户菜单' })).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(avatar).toBeFocused();
    const nav = page.getByRole('navigation', { name: '主要功能', exact: true });
    await nav.getByRole('link', { name: '发现', exact: true }).tap();
    await expect(page).toHaveURL(/\/discover$/);
    await nav.getByRole('link', { name: '聊天', exact: true }).tap();
    await expect(page.getByRole('textbox', { name: '消息草稿' })).toBeVisible();
  } else {
    await expectSidebarGroups(page);
    const draft = page.getByRole('textbox', { name: '消息草稿' });
    await draft.fill('桌面布局切换保留草稿');
    fixture.push('1', '宽屏布局测试');
    await expect(page.getByText('宽屏布局测试', { exact: true })).toBeVisible();
    const { connections, historyRequests } = fixture.stats();
    await page.setViewportSize({ width: 1920, height: 908 });
    await expectWideSideChat(page);
    await page.screenshot({ path: info.outputPath('sidebar-dark.png'), scale: 'css' });
    await page.setViewportSize({ width: 800, height: 530 });
    const members = page.getByRole('complementary', { name: '经典在线成员', exact: true });
    await expect(members).toBeHidden();
    expect((await draft.boundingBox())!.width).toBeGreaterThan(180);
    await expect(draft).toHaveText('桌面布局切换保留草稿');
    expect(fixture.stats()).toMatchObject({ connections, historyRequests });
    const memberList = page.getByRole('button', { name: '查看聊天列表', exact: true });
    await memberList.click();
    const list = page.getByRole('dialog', { name: '聊天列表', exact: true });
    await expect(list).toBeVisible();
    await list.getByRole('button', { name: '关闭聊天列表', exact: true }).click();
    await expect(memberList).toBeFocused();
    await page.screenshot({ path: info.outputPath('sidebar-compact-chat.png'), scale: 'css' });
    await expectCenteredSidebar(page);
    const nav = page.getByRole('navigation', { name: '主要功能', exact: true });
    const hot = nav.getByRole('link', { name: '热榜', exact: true });
    const about = nav.getByRole('link', { name: '关于', exact: true });
    await hot.hover();
    const normal = await hot.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(normal).not.toBe('rgba(0, 0, 0, 0)');
    await page.mouse.wheel(0, 450);
    await expect.poll(() => nav.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await about.focus();
    await expect(about).toBeInViewport();
    await page.keyboard.press('Tab');
    const tools = nav.getByRole('link', { name: '工具', exact: true });
    await expect(tools).toBeFocused();
    await expect(tools).toHaveCSS('outline-style', 'solid');
    const dimensions = await nav.evaluate((el) => ({
      paddingStart: parseFloat(getComputedStyle(el).paddingInlineStart),
      paddingEnd: parseFloat(getComputedStyle(el).paddingInlineEnd),
      overflow: el.scrollWidth > el.clientWidth,
    }));
    expect(dimensions).toEqual({ paddingStart: 8, paddingEnd: 8, overflow: false });
    await expectCenteredSidebar(page);
    await page.keyboard.press('Tab');
    await expect(nav.getByRole('link', { name: '管理页', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(nav.getByRole('button', { name: /^每日签到/ })).toBeFocused();
    await page.keyboard.press('Tab');
    const avatar = page.getByRole('button', { name: '用户菜单', exact: true });
    await expect(avatar).toBeFocused();
    await page.keyboard.press('Enter');
    const accountMenu = page.getByRole('menu', { name: '用户菜单' });
    await expect(accountMenu).toBeInViewport({ ratio: 1 });
    const menuBounds = (await accountMenu.boundingBox())!;
    const avatarBounds = (await avatar.boundingBox())!;
    expect(menuBounds.y + menuBounds.height).toBeLessThanOrEqual(avatarBounds.y);
    await page.screenshot({ path: info.outputPath('sidebar-dark-account.png'), scale: 'css' });
    await page.keyboard.press('Escape');
    await expect(avatar).toBeFocused();

    for (const [name, expected] of [
      ['顶部菜单', 'topbar'],
      ['侧边菜单', 'side'],
    ] as const) {
      await avatar.click();
      await accountMenu.getByRole('menuitem', { name: '网站设置' }).click();
      const settings = page.getByRole('dialog', { name: '网站设置', exact: true });
      await settings.getByRole('combobox', { name: '电脑端菜单位置' }).click();
      await page.getByRole('option', { name }).click();
      await settings.getByRole('button', { name: '保存', exact: true }).click();
      await expect(shell).toHaveAttribute('data-navigation-layout', expected);
      await expect(settings.getByRole('status')).toHaveText('已保存到此浏览器');
      await settings.getByRole('button', { name: '关闭网站设置' }).click();
      await expect(avatar).toBeFocused();
    }
    await nav.getByRole('link', { name: '管理页', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/user$/);
    await expect(page.getByRole('complementary', { name: '管理导航', exact: true })).toBeVisible();
  }
});
