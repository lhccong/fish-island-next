import { expect, test, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { openMessageActions } from './chat-message-actions';

test.setTimeout(60000);

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const name of ['群聊消息区', '群聊输入区']) {
    const area = page.getByRole('region', { name, exact: true });
    expect(await area.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
  for (const row of await page.locator('article[data-message-id]').all()) {
    expect(await row.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: worksheet layout, states and message operations`, async ({
      page,
    }, info) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const fixture = await setupChatMenu(page, skin.id, mode);
      const mobile = page.viewportSize()!.width <= 760;
      const worksheet = skin.id === 'wps';
      const snapshot = async (name: string) => {
        if (worksheet)
          await page.screenshot({
            path: info.outputPath(name),
            scale: 'css',
            animations: 'disabled',
          });
      };
      const sidebar = page.getByRole('complementary', { name: '聊天会话', exact: true });
      if (worksheet || mobile) await expect(sidebar).toBeHidden();
      else await expect(sidebar).toBeVisible();
      const columns = page.getByLabel('消息工作表列', { exact: true });
      await expect(columns).toHaveCount(worksheet ? 1 : 0);
      if (worksheet) {
        expect((await page.locator('#main-content').boundingBox())!.x).toBe(0);
        await expect(columns.getByText('消息内容', { exact: true })).toBeVisible();
        const composer = page.getByRole('region', { name: '群聊输入区', exact: true });
        const composerBox = (await composer.boundingBox())!;
        expect(composerBox.y + composerBox.height).toBeLessThanOrEqual(
          (await columns.boundingBox())!.y,
        );
        if (!mobile) {
          await expect(page.getByRole('heading', { name: '鱼岛群聊', exact: true })).toBeHidden();
          expect(composerBox.height).toBeLessThanOrEqual(52);
          const sendBox = (await page
            .getByRole('button', { name: '发送', exact: true })
            .boundingBox())!;
          const detailsBox = (await page
            .getByRole('button', { name: '群聊详情', exact: true })
            .boundingBox())!;
          expect(sendBox.x + sendBox.width + 8).toBeLessThanOrEqual(detailsBox.x);
        }
      }
      await noOverflow(page);
      await snapshot('empty.png');

      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      let fail = true;
      await page.route('**/api/chat/message/page/vo', async (route) => {
        if (fail) {
          await pending;
          await route.fulfill({ status: 503 });
        } else await route.fulfill({ json: { code: 0, data: { records: [] } } });
      });
      await page.getByRole('link', { name: mobile ? '返回热榜' : '热榜', exact: true }).click();
      await page.goBack();
      await expect(page.getByText('正在加载历史消息…', { exact: true })).toBeVisible();
      await noOverflow(page);
      await snapshot('loading.png');
      release();
      const retryHistory = page.getByRole('button', { name: '重试历史消息', exact: true });
      await expect(retryHistory).toBeVisible();
      await noOverflow(page);
      await snapshot('error.png');
      fail = false;
      if (mobile) await retryHistory.tap();
      else await retryHistory.click();
      await expect(page.getByText('暂无消息，连接后将在这里接收新消息')).toBeVisible();

      fixture.push('1', '工作表正文 ' + '长文本与链接 https://example.com/'.repeat(12));
      fixture.push('2', '本人消息，按主题标识当前行', true);
      fixture.push('3', '[img]https://menu.test/image.png[/img]');
      fixture.broadcast({
        id: 'title',
        content: '称号显示检查',
        sender: { id: '456', name: '合成岛友', titleId: '12' },
        timestamp: Date.now(),
      });
      const titled = page.locator('[data-message-id="title"]');
      await expect(titled).toBeVisible();
      await expect(titled.getByRole('img', { name: '摸鱼铲屎官', exact: true })).toHaveCount(
        worksheet ? 0 : 1,
      );
      const imageRow = page.locator('[data-message-id="3"]');
      await expect(
        imageRow.getByRole('button', { name: '放大聊天图片', exact: true }),
      ).toBeVisible();
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('切换呈现仍保留草稿');
      const menu = await openMessageActions(page, '2');
      await menu.getByRole('menuitem', { name: '引用', exact: true }).click();
      await expect(page.getByRole('region', { name: '引用消息', exact: true })).toContainText(
        '本人消息',
      );
      await expect(draft).toHaveText('切换呈现仍保留草稿');
      await expect(draft).toBeFocused();
      await page.getByRole('button', { name: '取消引用', exact: true }).click();
      const copyMenu = await openMessageActions(page, '2');
      await copyMenu.getByRole('menuitem', { name: '复制', exact: true }).click();
      await expect.poll(fixture.clipboardText).toBe('本人消息，按主题标识当前行');

      const details = page.getByRole('button', { name: '群聊详情', exact: true });
      if (mobile) await details.tap();
      else await details.click();
      await expect(
        page.getByRole('complementary', { name: '在线成员', exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: '关闭在线列表', exact: true }).click();
      await expect(details).toBeFocused();
      await expect(draft).toHaveText('切换呈现仍保留草稿');
      await noOverflow(page);

      let sends = 0;
      await page.route('**/api/chat/message/send', async (route) => {
        sends++;
        if (sends === 1) return route.fulfill({ status: 503 });
        const data = route.request().postDataJSON() as { content: string; clientMessageId: string };
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
      const send = page.getByRole('button', { name: '发送', exact: true });
      if (mobile) await send.tap();
      else await send.click();
      const retrySend = page.getByRole('button', { name: '重试发送', exact: true });
      await expect(retrySend).toBeVisible();
      await noOverflow(page);
      await snapshot('send-failed.png');
      if (mobile) await retrySend.tap();
      else await retrySend.click();
      await expect(page.locator('[data-message-id="4"]')).toBeVisible();
      await expect(retrySend).toHaveCount(0);
      await snapshot('success.png');
      await noOverflow(page);
      for (const id of ['5', '6', '7'])
        fixture.broadcast({
          id,
          content: '连续消息合并',
          timestamp: Date.now() + Number(id),
          sender: { id: `participant-${id}`, name: `合成成员${id}`, titleId: '12' },
        });
      const participants = page.getByRole('list', { name: '复读参与者', exact: true });
      await expect(participants.getByRole('listitem')).toHaveCount(3);
      await expect(participants.getByRole('listitem').first()).toHaveAttribute(
        'title',
        worksheet ? '合成成员5' : '合成成员5：摸鱼铲屎官',
      );
      await noOverflow(page);
      expect(fixture.stats().connections).toBe(1);
      expect(errors).toEqual([]);
    });
  }

test('WPS theme and mode switching preserves mounted draft and messages without requests', async ({
  page,
}) => {
  const fixture = await setupChatMenu(page, 'wps', 'light');
  const viewport = page.viewportSize()!;
  const mobile = viewport.width <= 760;
  fixture.push('11', '换肤保留这条消息');
  const draft = page.getByRole('textbox', { name: '消息草稿', includeHidden: true });
  await draft.fill('同一个输入框');
  const editor = await draft.elementHandle();
  const requests = fixture.stats().historyRequests;
  // Theme entry belongs to the desktop office ribbon; resizing exercises the same mounted tree.
  if (mobile) await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: '切换主题', exact: true }).click();
  const picker = page.getByRole('dialog', { name: '主题模式' });
  for (const skin of builtinSkins) {
    await picker.getByRole('button', { name: skin.name, exact: true }).click();
    for (const mode of ['暗夜模式', '明亮模式']) {
      await picker.getByRole('button', { name: mode, exact: true }).click();
      await expect(draft).toHaveText('同一个输入框');
      expect(await editor!.evaluate((el) => el.isConnected)).toBe(true);
      expect(fixture.stats()).toMatchObject({ connections: 1, historyRequests: requests });
    }
  }
  await picker.getByRole('button', { name: 'WPS 表格', exact: true }).click();
  await page.keyboard.press('Escape');
  if (mobile) await page.setViewportSize(viewport);
  await expect(page.locator('[data-message-id="11"]')).toBeVisible();
  await noOverflow(page);
});

test('WPS formula controls stay separate at desktop breakpoints and with details open', async ({
  page,
}) => {
  test.skip(page.viewportSize()!.width <= 760, 'desktop formula row');
  await setupChatMenu(page, 'wps', 'dark');
  for (const width of [761, 800, 1024, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const open of [false, true]) {
      const details = page.getByRole('button', { name: '群聊详情', exact: true });
      if (open) await details.click();
      const send = (await page.getByRole('button', { name: '发送', exact: true }).boundingBox())!;
      const button = (await details.boundingBox())!;
      const editor = (await page.getByRole('textbox', { name: '消息草稿' }).boundingBox())!;
      expect(editor.width).toBeGreaterThan(40);
      expect(editor.x + editor.width).toBeLessThanOrEqual(send.x - 8);
      expect(send.x + send.width).toBeLessThanOrEqual(button.x - 8);
      await noOverflow(page);
      if (open) await page.getByRole('button', { name: '关闭在线列表', exact: true }).click();
    }
  }
});
