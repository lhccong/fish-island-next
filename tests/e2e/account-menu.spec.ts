import { expect, test, type WebSocketRoute } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { openMessageActions } from './chat-message-actions';
import { open, close, layout, capture } from './account-menu-layout';

for (const width of [1280, 375, 390]) {
  test.describe(`${width}px`, () => {
    test.use({
      viewport: { width, height: width === 1280 ? 800 : 844 },
      isMobile: width < 760,
      hasTouch: width < 760,
    });
    for (const skin of builtinSkins)
      for (const mode of ['light', 'dark']) {
        test(`${skin.id} ${mode}: 账号菜单与工具`, async ({ page }, info) => {
          page.setDefaultTimeout(20000);
          await page.addInitScript(
            ({ skin, mode }) => {
              localStorage.setItem('fish-island:skin', skin);
              localStorage.setItem('fish-island:color-mode', mode);
              localStorage.setItem(
                'fish-island:blacklist:synthetic-account',
                JSON.stringify([{ id: 'synthetic-blocked', name: '合成屏蔽用户' }]),
              );
              sessionStorage.setItem(
                'fish-island-next.session:https%3A%2F%2Fapi.yucoder.cn',
                JSON.stringify({ tokenName: 'synthetic-session', tokenValue: 'synthetic' }),
              );
            },
            { skin: skin.id, mode },
          );
          const sockets: WebSocketRoute[] = [];
          await page.routeWebSocket(/\/ws\//, (socket) => {
            sockets.push(socket);
            socket.onMessage(() => {});
          });
          await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
          let following = true;
          await page.route('**/api/user/get/login', (route) =>
            route.fulfill({
              json: {
                code: 0,
                data: {
                  id: 'synthetic-account',
                  userName: '合成岛友',
                  userRole: 'user',
                  email: 'test@example.test',
                  userProfile: '这是一条合成简介',
                  points: 100,
                  level: 2,
                  followerCount: '0',
                  followingCount: following ? '1' : '0',
                },
              },
            }),
          );
          let redeem = 0,
            appReads = 0;
          let apps: object[] = [];
          await page.route('**/api/follow/following?*', (route) =>
            route.fulfill({
              json: {
                code: 0,
                data: {
                  total: following ? '1' : '0',
                  records: following
                    ? [{ userId: 'synthetic-follow', userName: '合成关注', isMutual: true }]
                    : [],
                },
              },
            }),
          );
          await page.route('**/api/follow/followers?*', (route) =>
            route.fulfill({ json: { code: 0, data: { total: '0', records: [] } } }),
          );
          await page.route('**/api/follow/toggle?*', (route) => {
            following = false;
            return route.fulfill({ json: { code: 0, data: false } });
          });
          let release!: () => void;
          const gate = new Promise<void>((resolve) => {
            release = resolve;
          });
          let listError = true;
          await page.route('**/api/auth/app/list/my', async (route) => {
            appReads++;
            if (listError) {
              await gate;
              return route.fulfill({ json: { code: 50000, message: '应用读取失败，请重试' } });
            }
            await route.fulfill({ json: { code: 0, data: apps } });
          });
          await page.route('**/api/auth/app/create', async (route) => {
            const body = route.request().postDataJSON() as object;
            apps = [{ ...body, id: 'synthetic-app', clientId: 'synthetic-client', status: 1 }];
            await route.fulfill({ json: { code: 0, data: { id: 'synthetic-app' } } });
          });
          await page.route('**/api/auth/app/update', async (route) => {
            apps = [{ ...apps[0], ...route.request().postDataJSON() }];
            await route.fulfill({ json: { code: 0, data: true } });
          });
          await page.route('**/api/auth/app/detail?*', (route) =>
            route.fulfill({ json: { code: 0, data: { clientSecret: 'synthetic-secret' } } }),
          );
          await page.route('**/api/auth/app/reset-secret?*', (route) =>
            route.fulfill({ json: { code: 0, data: 'synthetic-reset-secret' } }),
          );
          await page.route('**/api/auth/app/delete', async (route) => {
            apps = [];
            await route.fulfill({ json: { code: 0, data: true } });
          });
          await page.route('**/api/redeemCode/use', (route) => {
            redeem++;
            return route.fulfill({
              json:
                redeem === 1
                  ? { code: 50000, message: '兑换码无效' }
                  : { code: 0, data: { message: '合成奖励兑换成功' } },
            });
          });
          await page.route('**/api/user/email/send', (route) =>
            route.fulfill({ json: { code: 0, data: true } }),
          );
          await page.route('**/api/user/email/resetPassword', (route) =>
            route.fulfill({ json: { code: 0, data: true } }),
          );
          await page.route('**/api/user/logout', (route) =>
            route.fulfill({ json: { code: 0, data: true } }),
          );
          await page.route('**/api/chat/message/page/vo', (route) =>
            route.fulfill({ json: { code: 0, data: { records: [] } } }),
          );
          await page.goto('/', { waitUntil: 'domcontentloaded' });
          await page.getByRole('button', { name: '用户菜单', exact: true }).click();
          await expect(page.getByRole('menuitem', { name: '老板键设置' })).toHaveCount(0);
          await expect(page.getByRole('menuitem', { name: '重置位置' })).toHaveCount(0);
          await capture(page, '用户菜单');
          await page.keyboard.press('Escape');
          await open(page, '修改信息');
          await layout(page, width < 760);
          await close(page);
          await open(page, '个人资料与签到');
          await capture(page, '个人资料');
          await close(page);
          await open(page, '我的卡片');
          await expect(page.getByRole('dialog').getByText('这是一条合成简介')).toBeVisible();
          await layout(page, width < 760);
          await page.getByRole('button', { name: '关注 1', exact: true }).click();
          await expect(page.getByText('合成关注', { exact: true })).toBeVisible();
          await page.getByRole('button', { name: '取消关注', exact: true }).click();
          await expect(page.getByText('暂无关注。', { exact: true })).toBeVisible();
          await page.getByRole('button', { name: '返回卡片' }).click();
          await expect(page.getByRole('button', { name: '关注 0', exact: true })).toBeFocused();
          await page.getByRole('button', { name: '粉丝 0', exact: true }).click();
          await expect(page.getByText('暂无粉丝。', { exact: true })).toBeVisible();
          await close(page);
          await open(page, '我的黑名单');
          await page.getByRole('button', { name: '移除', exact: true }).click();
          await page.getByRole('button', { name: '确认移除' }).click();
          await expect(page.getByText('暂无黑名单用户。', { exact: false })).toBeVisible();
          await close(page);
          await open(page, '找回密码');
          await page.getByRole('button', { name: '获取验证码' }).click();
          await expect(page.getByRole('status').filter({ hasText: '验证码已发送' })).toBeVisible();
          await expect(page.getByRole('button', { name: /秒后重发/ })).toBeDisabled();
          await layout(page, width < 760);
          await close(page);
          await open(page, '兑换码');
          await page.getByRole('textbox', { name: '兑换码', exact: true }).fill('synthetic-code');
          await page.getByRole('button', { name: '立即兑换' }).click();
          await expect(page.getByRole('alert')).toHaveText('兑换码无效');
          await layout(page, width < 760);
          await expect(page.getByRole('textbox', { name: '兑换码', exact: true })).toHaveValue(
            'synthetic-code',
          );
          await page.getByRole('button', { name: '立即兑换' }).click();
          await expect(
            page.getByRole('status').filter({ hasText: '合成奖励兑换成功' }),
          ).toBeVisible();
          await close(page);
          await open(page, '开放平台');
          await expect(page.getByRole('status').filter({ hasText: '正在读取应用' })).toBeVisible();
          await layout(page, width < 760);
          release();
          await expect(page.getByRole('alert')).toHaveText('应用读取失败，请重试');
          await layout(page, width < 760);
          listError = false;
          await page.getByRole('button', { name: '重试', exact: true }).click();
          await expect(page.getByText('暂无应用，', { exact: false })).toBeVisible();
          await page.getByRole('button', { name: '创建应用', exact: true }).click();
          await page.getByLabel('应用名称', { exact: true }).fill('合成应用');
          await page.getByLabel('回调地址', { exact: true }).fill('https://example.test/callback');
          await layout(page, width < 760);
          await page.getByRole('button', { name: '创建应用', exact: true }).click();
          await expect(page.getByText('合成应用', { exact: true })).toBeVisible();
          await page.getByRole('button', { name: '查看密钥' }).click();
          await expect(page.getByText('synthetic-secret', { exact: true })).toBeVisible();
          await page.getByRole('button', { name: '隐藏密钥' }).click();
          await expect(page.getByText('synthetic-secret', { exact: true })).toHaveCount(0);
          await page.getByRole('button', { name: '编辑', exact: true }).click();
          await page.getByLabel('应用名称', { exact: true }).fill('合成应用已编辑');
          await page.getByRole('combobox', { name: '应用状态' }).click();
          await page.getByRole('option', { name: '禁用', exact: true }).click();
          await page.getByRole('button', { name: '保存', exact: true }).click();
          await expect(page.getByText('合成应用已编辑', { exact: true })).toBeVisible();
          await expect(page.getByText('已禁用', { exact: true })).toBeVisible();
          await page.getByRole('button', { name: '重置密钥', exact: true }).click();
          await page.getByRole('button', { name: '确认重置' }).click();
          await expect(page.getByText('synthetic-reset-secret', { exact: true })).toBeVisible();
          await layout(page, width < 760);
          await page.screenshot({ path: info.outputPath(`${skin.id}-${mode}-${width}.png`) });
          await page.getByRole('button', { name: '删除', exact: true }).click();
          await page.getByRole('button', { name: '确认删除' }).click();
          await expect(page.getByText('暂无应用，', { exact: false })).toBeVisible();
          await close(page);
          await open(page, '网站设置');
          await expect(page.getByRole('textbox', { name: '网站名称' })).toBeVisible();
          await layout(page, width < 760);
          await close(page);
          await open(page, '网站引导');
          await layout(page, width < 760);
          for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '下一步' }).click();
          await page.getByRole('button', { name: '完成', exact: true }).click();
          await expect(page.getByRole('dialog')).toHaveCount(0);
          await page.getByRole('button', { name: '工作时间设置' }).click();
          await page.getByRole('combobox', { name: '工作制', exact: true }).click();
          await page.getByRole('option', { name: '大小周', exact: true }).click();
          await expect(page.getByRole('combobox', { name: '本周类型' })).toBeVisible();
          await layout(page, width < 760);
          await page.getByRole('button', { name: '保存', exact: true }).click();
          await expect(page.getByText('已保存到此浏览器', { exact: true })).toBeVisible();
          await page.keyboard.press('Escape');
          await page.getByRole('button', { name: '用户菜单', exact: true }).click();
          await page.getByRole('menuitem', { name: '隐藏工作时间' }).click();
          await expect(page.getByRole('button', { name: '工作时间设置' })).toHaveCount(0);
          const beforeMode = appReads;
          await page.getByRole('button', { name: '用户菜单', exact: true }).click();
          await page
            .getByRole('menuitem', { name: mode === 'dark' ? '切换明亮模式' : '切换深色模式' })
            .click();
          expect(await page.evaluate(() => localStorage.getItem('fish-island:color-mode'))).toBe(
            mode === 'dark' ? 'light' : 'dark',
          );
          expect(appReads).toBe(beforeMode);
          await page.getByRole('button', { name: '用户菜单', exact: true }).click();
          await page.getByRole('menuitem', { name: '显示工作时间' }).click();
          await page.goto('/chat', { waitUntil: 'domcontentloaded' });
          const draft = page.getByRole('textbox', { name: '消息草稿' });
          await draft.fill('切换菜单保留的草稿');
          await page.getByRole('button', { name: '发送', exact: true }).click({ trial: true });
          await expect(page.getByRole('button', { name: '工作时间设置' })).toHaveCount(1);
          await expect(page.getByRole('status', { name: '聊天室连接状态' })).toContainText(
            '已连接',
          );
          sockets.at(-1)!.send(
            JSON.stringify({
              type: 'chat',
              data: {
                message: {
                  id: 'synthetic-block-message',
                  content: '合成可屏蔽正文',
                  sender: { id: 'synthetic-message-sender', name: '合成消息岛友' },
                  timestamp: 1794441600000,
                },
              },
            }),
          );
          await expect(page.getByText('合成可屏蔽正文', { exact: true })).toBeVisible();
          const actions = await openMessageActions(page, 'synthetic-block-message');
          await actions.getByRole('menuitem', { name: '加入黑名单' }).click();
          await page
            .getByRole('dialog', { name: '加入黑名单', exact: true })
            .getByRole('button', { name: '确认加入', exact: true })
            .click();
          await expect(draft).toBeFocused();
          await expect(page.getByText('合成可屏蔽正文', { exact: true })).toHaveCount(0);
          await open(page, '我的黑名单');
          await page.getByRole('button', { name: '移除', exact: true }).last().click();
          await page.getByRole('button', { name: '确认移除' }).click();
          await close(page);
          if (width < 760) await page.getByRole('link', { name: '聊天', exact: true }).click();
          await expect(page.getByText('合成可屏蔽正文', { exact: true })).toBeVisible();
          await expect(draft).toHaveText('切换菜单保留的草稿');
          await open(page, '找回密码');
          await page.getByLabel('验证码', { exact: true }).fill('synthetic-code');
          await page.getByLabel('新密码', { exact: true }).fill('synthetic-password');
          await page.getByLabel('确认密码', { exact: true }).fill('synthetic-password');
          await page.getByRole('button', { name: '重置密码', exact: true }).click();
          await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible();
          sockets.forEach((socket) => socket.close());
        });
      }
  });
}
