import { expect, test } from '@playwright/test';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(60_000);

for (const mode of ['light', 'dark'])
  test(`classic ${mode}: member collapse preserves loading, empty, error and success`, async ({
    page,
  }, info) => {
    let phase = 'loading';
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let requests = 0;
    const fixture = await setupChatMenu(page, 'moyu-island', mode, 'user', async () => {
      await page.route('**/api/chat/online/user', async (route) => {
        requests++;
        if (phase === 'loading') await pending;
        return route.fulfill({
          status: phase === 'error' ? 503 : 200,
          json: {
            code: 0,
            data: phase === 'success' ? [{ id: '456', name: '合成成员', level: 3 }] : [],
          },
        });
      });
    });
    const mobile = page.viewportSize()!.width <= 760;
    const panel = mobile
      ? page.getByRole('dialog', { name: '聊天列表', exact: true })
      : page.getByRole('complementary', { name: '经典在线成员', exact: true });
    const open = async () => {
      if (mobile) await page.getByRole('button', { name: '查看聊天列表', exact: true }).tap();
      else await page.getByRole('button', { name: '展开在线成员', exact: true }).click();
    };
    const close = async () => {
      if (mobile) await panel.getByRole('button', { name: '关闭聊天列表', exact: true }).tap();
      else await panel.getByRole('button', { name: '隐藏在线成员', exact: true }).click();
    };
    if (mobile) await open();
    await expect(panel.getByRole('status')).toHaveText(
      mobile ? '正在加载列表…' : '正在获取在线成员…',
    );
    const before = fixture.stats();
    const beforeRequests = requests;
    await close();
    await open();
    expect(requests).toBe(beforeRequests);
    expect(fixture.stats().connections).toBe(before.connections);
    expect(fixture.stats().historyRequests).toBe(before.historyRequests);
    phase = 'empty';
    release();
    if (mobile) {
      await expect(panel.getByRole('status')).toHaveText('暂无列表内容，稍后刷新看看');
    } else await expect(panel.getByText('暂无在线成员', { exact: true })).toBeVisible();
    await close();
    phase = 'error';
    await page.reload();
    await expect(page.getByRole('textbox', { name: '消息草稿', exact: true })).toBeVisible();
    await open();
    await expect(panel.getByRole('alert')).toBeVisible();
    await close();
    await open();
    await expect(panel.getByRole('alert')).toBeVisible();
    phase = 'success';
    await panel.getByRole('button', { name: '重试', exact: true }).click();
    await expect(panel.getByText('合成成员', { exact: true })).toBeVisible();
    const member = panel.getByRole('button', { name: '查看合成成员的用户卡片', exact: true });
    await member.focus();
    await expect(member).toBeInViewport();
    expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath('member-states.png') });
    await close();
  });
