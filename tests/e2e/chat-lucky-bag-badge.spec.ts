import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(60000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: available lucky bag badge stays in sync`, async ({ page }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      const mobile = page.viewportSize()!.width <= 760;
      const act = async (target: Locator) => {
        await target.scrollIntoViewIfNeeded();
        if (mobile) await target.tap();
        else await target.click();
      };
      const future = Date.now() + 1800000;
      const bag = (id: string, joined = false) => ({
        id,
        name: `合成福袋${id}`,
        creatorName: '合成岛友',
        totalAmount: 50,
        winnerCount: 5,
        participantCount: 0,
        type: 1,
        status: 0,
        joined,
        drawTime: future,
      });
      let bags = [
        bag('a'),
        bag('a'),
        bag('b'),
        bag('joined', true),
        { ...bag('drawn'), status: 1 },
        { ...bag('expired'), drawTime: Date.now() - 1000 },
      ];
      let failed = false;
      let reads = 0;
      let joins = 0;
      await page.route('**/api/luckybag/active', async (route) => {
        reads++;
        await route.fulfill({
          json: failed ? { code: 50001, message: '合成福袋列表读取失败' } : { code: 0, data: bags },
        });
      });
      await page.route('**/api/luckybag/detail?*', (route) => {
        const id = new URL(route.request().url()).searchParams.get('luckyBagId');
        const item = bags.find((value) => value.id === id);
        return route.fulfill({
          json: item ? { code: 0, data: item } : { code: 40400, message: '合成福袋已结束' },
        });
      });
      await page.route('**/api/luckybag/join?*', (route) => {
        joins++;
        bags = bags.map((item) =>
          item.id === 'a' ? { ...item, joined: true, participantCount: 1 } : item,
        );
        return route.fulfill({ json: { code: 0, data: true } });
      });
      await page.route('https://oss.cqbo.com/moyu/fudai.jpg', (route) => route.abort());
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('数量角标不影响草稿');
      fixture.push('101', '合成新福袋[luckybag]a[/luckybag]');
      if (mobile) await act(page.getByRole('button', { name: '更多聊天工具' }));
      const launcher = page.getByRole('button', { name: '进行中的福袋', exact: true });
      const badge = launcher.locator('[data-lucky-bag-count]');
      await expect(badge).toHaveText('2');
      await expect(launcher).toHaveAttribute('title', '2 个福袋可参与');
      const bounds = (await launcher.boundingBox())!,
        badgeBounds = (await badge.boundingBox())!;
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(badgeBounds.x).toBeGreaterThanOrEqual(bounds.x);
      expect(badgeBounds.x + badgeBounds.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
      await launcher.focus();
      await page.screenshot({ path: info.outputPath('available-badge.png') });
      const before = reads;
      fixture.push('102', '普通聊天消息');
      await page.waitForTimeout(250);
      expect(reads).toBe(before);
      if (mobile) await act(page.getByRole('link', { name: '返回热榜', exact: true }));
      await act(page.getByRole('button', { name: '切换主题', exact: true }));
      const picker = page.getByRole('dialog', { name: '主题模式' });
      await act(
        picker.getByRole('button', {
          name: mode === 'light' ? '暗夜模式' : '明亮模式',
          exact: true,
        }),
      );
      await act(
        picker.getByRole('button', {
          name: skin.id === 'wps' ? '微信绿' : 'WPS 表格',
          exact: true,
        }),
      );
      await page.keyboard.press('Escape');
      if (mobile) {
        await act(
          page
            .getByRole('navigation', { name: '主要功能', exact: true })
            .getByRole('link', { name: '聊天', exact: true }),
        );
        await act(page.getByRole('button', { name: '更多聊天工具' }));
      }
      await expect(badge).toHaveText('2');
      expect(reads).toBe(before);
      await act(launcher);
      const list = page.getByRole('dialog', { name: '进行中的福袋', exact: true });
      await act(list.getByRole('button', { name: '查看福袋：合成福袋a', exact: true }));
      const detail = page.getByRole('dialog', { name: '福袋详情', exact: true });
      await act(detail.getByRole('button', { name: '参与福袋', exact: true }));
      await expect(detail.getByRole('status').filter({ hasText: '参与成功' })).toBeVisible();
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      await expect(launcher).toBeFocused();
      await expect(badge).toHaveText('1');
      expect(joins).toBe(1);
      failed = true;
      fixture.push('103', '[luckybag]b[/luckybag]');
      await expect.poll(() => reads).toBeGreaterThan(before + 1);
      await act(launcher);
      await expect(list.getByRole('alert')).toContainText('合成福袋列表读取失败');
      // A failed read retains the known count and cards.
      await page.keyboard.press('Escape');
      await expect(badge).toHaveText('1');
      failed = false;
      bags = Array.from({ length: 100 }, (_, index) => bag(`large-${index}`));
      fixture.push('104', '[luckybag]large-0[/luckybag]');
      await expect(badge).toHaveText('99+');
      await expect(launcher).toHaveAttribute('title', '100 个福袋可参与');
      bags = [];
      fixture.broadcast({
        id: '105',
        content: '福袋状态更新',
        sender: { id: '-1', name: '合成摸鱼助手' },
        timestamp: Date.now(),
      });
      await expect(badge).toHaveCount(0);
      await act(launcher);
      await expect(list.getByText('暂无进行中的福袋，可以发送一个邀请岛友参与。')).toBeVisible();
      await page.keyboard.press('Escape');
      bags = [{ ...bag('short'), drawTime: Date.now() + 2000 }];
      const beforeShort = reads;
      fixture.push('106', '[luckybag]short[/luckybag]');
      await expect.poll(() => reads).toBeGreaterThan(beforeShort);
      await expect(badge).toHaveText('1');
      const beforeExpiry = reads;
      await expect(badge).toHaveCount(0, { timeout: 5000 });
      expect(reads).toBe(beforeExpiry);
      await expect(draft).toHaveText('数量角标不影响草稿');
      expect(fixture.stats().connections).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
