import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { verifyChatList } from './chat-list-assertions';

test.setTimeout(60_000);

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: group layout and online member lifecycle`, async ({ page }, info) => {
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skin: skin.id, mode },
      );
      await page.route('**/api/**', (route) => route.abort());
      await page.route('**/api/hot/list', (route) =>
        route.fulfill({ json: { code: 0, data: [] } }),
      );
      await page.route('**/api/user/**', (route) =>
        route.fulfill({
          json: {
            code: 0,
            data: {
              id: '123',
              userName: '合成岛友',
              userRole: 'user',
              saTokenInfo: { tokenName: 'test-session', tokenValue: 'synthetic-value' },
            },
          },
        }),
      );
      let phase = 'loading';
      let requests = 0;
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      const members = Array.from({ length: 100 }, (_, i) => ({
        id: String(i + 1),
        name: i === 49 ? `合成岛友50${'项目协作对接负责人'.repeat(4)}` : `合成岛友${i + 1}`,
        avatar: i === 0 ? 'https://members.test/broken.png' : null,
      }));
      await page.route('https://members.test/**', (route) => route.fulfill({ status: 404 }));
      await page.route('**/api/chat/online/user', async (route) => {
        requests++;
        expect(route.request().headers()['test-session']).toBe('synthetic-value');
        if (phase === 'loading') await pending;
        await route.fulfill({
          status: phase === 'error' ? 503 : 200,
          json: { code: 0, data: phase === 'empty' ? [] : members },
        });
      });
      const noOverflow = async () => {
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        const panel = page.getByRole('complementary', { name: '在线成员', exact: true });
        if (await panel.isVisible()) {
          const box = await panel.boundingBox();
          expect(box!.x).toBeGreaterThanOrEqual(0);
          expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
          expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
        }
      };
      await page.goto('/chat');
      await page
        .getByRole('textbox', { name: '账号或邮箱', exact: true })
        .fill('synthetic-account');
      await page.getByLabel('密码', { exact: true }).fill('synthetic-password');
      await page.getByRole('button', { name: '登录', exact: true }).click();
      await expect(page.getByRole('heading', { name: '鱼岛群聊', level: 1 })).toBeVisible();
      const mobile = page.viewportSize()!.width <= 760;
      const rail = page.getByRole('complementary', { name: '应用导航', exact: true });
      if (mobile) {
        await expect(rail).toBeHidden();
        await expect(page.getByRole('link', { name: '返回热榜' })).toBeVisible();
      }
      const panel = page.getByRole('complementary', { name: '在线成员', exact: true });
      const trigger = page.getByRole('button', { name: '群聊详情', exact: true });
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await expect(panel).toHaveCount(0);
      await expect.poll(() => requests).toBe(1);
      await verifyChatList(page, info, 'loading');
      await draft.fill('合成草稿：保留输入');
      if (mobile) await expect(draft).toHaveCSS('scrollbar-width', 'none');
      await expect(page.getByRole('button', { name: '发送', exact: true })).toBeDisabled();
      await noOverflow();
      await page.screenshot({ path: info.outputPath('group-default.png') });
      await trigger.click();
      await expect(panel.getByRole('status')).toHaveText('正在获取在线成员…');
      await expect(panel.getByRole('button', { name: '刷新', exact: true })).toBeDisabled();
      await noOverflow();
      phase = 'success';
      release();
      await expect(panel.getByRole('listitem')).toHaveCount(16);
      await expect(panel.getByRole('heading', { name: '在线成员（100）' })).toBeVisible();
      await verifyChatList(page, info, 'success');
      const preview = panel.getByRole('list');
      const previewBounds = await preview.boundingBox();
      expect(previewBounds!.height).toBeLessThanOrEqual(300);
      const firstRow = () =>
        panel.getByRole('listitem').evaluateAll((items) =>
          items.slice(0, 4).map((item) => {
            const box = item.getBoundingClientRect();
            const avatar = item.firstElementChild!.getBoundingClientRect();
            return {
              x: box.x,
              width: box.width,
              avatarWidth: avatar.width,
              avatarHeight: avatar.height,
            };
          }),
        );
      const collapsedColumns = await firstRow();
      const more = panel.getByRole('button', { name: '查看更多', exact: true });
      await expect(more).toHaveAttribute('aria-expanded', 'false');
      await page.screenshot({ path: info.outputPath('online-collapsed.png') });
      await more.focus();
      await more.press('Enter');
      await expect(panel.getByRole('listitem')).toHaveCount(100);
      expect(await firstRow()).toEqual(collapsedColumns);
      const allMembers = panel.getByRole('region', { name: '全部在线成员', exact: true });
      const allBounds = await allMembers.boundingBox();
      expect(allBounds!.height).toBeLessThanOrEqual(304);
      expect(allBounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height * 0.4 + 1);
      await allMembers.hover();
      expect(
        await allMembers.evaluate((element) => element.scrollWidth <= element.clientWidth),
      ).toBe(true);
      await allMembers.evaluate((element) => {
        element.scrollTop = element.scrollHeight / 2;
      });
      await allMembers.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await expect(panel.getByRole('listitem').last()).toBeVisible();
      await panel.getByRole('button', { name: '收起成员', exact: true }).press('Enter');
      await expect(panel.getByRole('listitem')).toHaveCount(16);
      expect(await firstRow()).toEqual(collapsedColumns);
      await more.click();
      await allMembers.evaluate((element) => {
        element.scrollTop = 0;
      });
      const scroll = panel.getByRole('region', { name: '在线成员滚动区' });
      await scroll.hover();
      const track = allMembers.locator('..').locator(':scope > [data-orientation="vertical"]');
      await expect(track).toHaveCSS('visibility', mobile ? 'hidden' : 'visible');
      const layout = await scroll.evaluate((element) => {
        const grid = element.querySelector('ul')!;
        return {
          gutter: element.getBoundingClientRect().right - grid.getBoundingClientRect().right,
          overflow: element.scrollWidth > element.clientWidth,
        };
      });
      expect(layout.gutter).toBeGreaterThanOrEqual(page.viewportSize()!.width <= 760 ? 20 : 24);
      expect(layout.overflow).toBe(false);
      await scroll.evaluate((element) => {
        element.scrollTop = element.scrollHeight / 2;
      });
      await scroll.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await expect(panel.getByText('仅显示最近获取的成员，不代表群成员总数。')).toBeVisible();
      await scroll.evaluate((element) => {
        element.scrollTop = 0;
      });
      await page.screenshot({ path: info.outputPath('online-success.png') });
      const search = panel.getByRole('searchbox', { name: '搜索在线成员' });
      await search.fill('没有匹配');
      await expect(panel.getByRole('status')).toContainText('没有找到匹配');
      await search.fill('合成岛友100');
      await expect(panel.getByRole('listitem')).toHaveCount(1);
      await search.fill('');
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
      await expect(panel).toHaveCount(0);
      await expect(draft).toHaveValue('合成草稿：保留输入');
      await trigger.click();
      expect(requests).toBe(1);
      phase = 'error';
      await panel.getByRole('button', { name: '刷新', exact: true }).click();
      await expect(panel.getByRole('alert')).toContainText('在线成员加载失败');
      await verifyChatList(page, info, 'error');
      await noOverflow();
      await page.screenshot({ path: info.outputPath('online-error.png') });
      phase = 'empty';
      await panel.getByRole('button', { name: '重试' }).click();
      await expect(panel.getByRole('status')).toContainText('暂无在线成员');
      await verifyChatList(page, info, 'empty');
      await noOverflow();
      await page.screenshot({ path: info.outputPath('online-empty.png') });
      phase = 'success';
      await panel.getByRole('button', { name: '刷新', exact: true }).click();
      await expect(panel.getByRole('listitem')).toHaveCount(16);
      await panel.getByRole('button', { name: '关闭在线列表' }).click();
      await expect(trigger).toBeFocused();
      const viewport = page.viewportSize()!;
      if (mobile) await page.setViewportSize({ width: 1280, height: 900 });
      const themeTrigger = page.getByRole('button', { name: '切换主题', exact: true });
      await themeTrigger.click();
      const picker = page.getByRole('dialog', { name: '主题模式' });
      await picker
        .getByRole('button', { name: skin.id === 'wps' ? '微信绿' : 'WPS 表格', exact: true })
        .click();
      await picker
        .getByRole('button', { name: mode === 'light' ? '暗夜模式' : '明亮模式', exact: true })
        .click();
      await picker.getByRole('button', { name: '关闭', exact: true }).click();
      if (mobile) await page.setViewportSize(viewport);
      await expect(draft).toHaveValue('合成草稿：保留输入');
      await trigger.click();
      await expect(panel.getByRole('listitem')).toHaveCount(16);
      expect(requests).toBe(4);
      if (mobile) {
        await panel.getByRole('button', { name: '关闭在线列表' }).tap();
        await page.getByRole('link', { name: '返回热榜' }).tap();
        await expect(rail).toBeVisible();
        const bounds = await rail.boundingBox();
        expect(bounds!.y).toBeGreaterThan(viewport.height - 100);
        await rail.getByRole('link', { name: '发现', exact: true }).tap();
        await expect(page).toHaveURL('/discover');
        await page
          .getByRole('navigation', { name: '发现菜单' })
          .getByRole('link', { name: '游戏', exact: true })
          .tap();
        await expect(rail).toBeHidden();
        await page.getByRole('link', { name: '返回发现' }).tap();
        await expect(page).toHaveURL('/discover');
      }
    });
  }
