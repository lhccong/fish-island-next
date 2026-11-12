import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

test.setTimeout(90_000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'] as const) {
    test(`${skin.id} ${mode}: icon navigation and string-total leaderboard`, async ({
      page,
      isMobile,
    }, info) => {
      await page.addInitScript(
        ({ id, mode }) => {
          localStorage.setItem('fish-island:skin', id);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { id: skin.id, mode },
      );
      await page.route('**/api/**', (route) => route.abort());
      let state: 'ready' | 'empty' | 'error' = 'ready';
      let release: () => void = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let requests = 0;
      let failMore = true;
      const rankPages: number[] = [];
      await page.route('**/api/donation/**/vo', async (route) => {
        requests++;
        await gate;
        if (state === 'error') return route.fulfill({ status: 503, body: 'unavailable' });
        const body = route.request().postDataJSON() as { current: number; pageSize: number };
        const details = route.request().url().includes('/detail/');
        if (!details) rankPages.push(body.current);
        if (!details && body.current === 2 && failMore)
          return route.fulfill({ status: 503, body: 'more-unavailable' });
        const count = Math.max(0, Math.min(body.pageSize, 41 - (body.current - 1) * body.pageSize));
        const records =
          state === 'empty'
            ? []
            : Array.from({ length: count }, (_, index) => ({
                id: `${body.current}-${index}`,
                amount: 6.6,
                donorUser: { userName: `合成赞助者${body.current}-${index}` },
                remark: '合成回归数据',
                createTime: '2026-11-12T10:00:00',
              }));
        if (!details && body.current === 2)
          records.unshift({
            id: '1-0',
            amount: 6.6,
            donorUser: { userName: '合成赞助者1-0' },
            remark: '重复记录更新',
            createTime: '2026-11-12T10:00:00',
          });
        await route.fulfill({
          json: {
            code: 0,
            data: {
              total: state === 'empty' ? '0' : '41',
              records,
            },
          },
        });
      });
      await page.goto('/discover');
      const entry = page
        .getByRole('navigation', { name: '发现菜单' })
        .filter({ visible: true })
        .getByRole('link', { name: '关于', exact: true });
      if (isMobile) await entry.tap();
      else await entry.click();
      await expect(page).toHaveURL('/rank/reward');
      const nav = page.getByRole('navigation', { name: '关于模块' });
      await expect(nav.getByRole('link')).toHaveText([
        '赞助榜',
        '外卖福利',
        '共建与反馈',
        '其他产品',
        '狠狠点个 star',
      ]);
      await expect(nav.locator('svg')).toHaveCount(5);
      await expect(page.getByRole('menu')).toHaveCount(0);
      await expect(nav.getByRole('link', { name: '赞助榜', exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      );
      await expect(page.getByRole('status')).toHaveCount(2);
      await page.screenshot({ path: info.outputPath('loading.png') });
      release();
      const rank = page.getByRole('region', { name: '排行榜', exact: true });
      await expect(rank.getByRole('listitem')).toHaveCount(20);
      await expect(rank.locator('dl')).toHaveCount(0);
      const podium = rank.getByRole('list', { name: '赞助前三名' });
      await expect(podium.getByRole('listitem')).toHaveCount(3);
      await expect(podium.getByRole('listitem').first()).not.toHaveCSS(
        'background-color',
        'rgba(0, 0, 0, 0)',
      );
      await expect(podium.getByRole('listitem').first()).toHaveCSS('border-top-width', '0px');
      const leaders = await podium.locator(':scope > li').evaluateAll((nodes) =>
        nodes.map((node) => {
          const r = node.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, center: r.left + r.width / 2 };
        }),
      );
      expect(leaders[0]!.top).toBeCloseTo(leaders[1]!.top, 0);
      expect(leaders[1]!.center).toBeLessThan(leaders[0]!.center);
      expect(leaders[2]!.center).toBeGreaterThan(leaders[0]!.center);
      expect(leaders[1]!.top).toBeCloseTo(leaders[2]!.top, 0);
      const podiumCenter = await podium.evaluate((node) => {
        const r = node.getBoundingClientRect();
        return r.left + r.width / 2;
      });
      expect(leaders[0]!.center).toBeCloseTo(podiumCenter, 0);
      await expect(rank.getByRole('list', { name: '赞助排名列表' })).toHaveAttribute('start', '4');
      const activity = page.getByRole('region', { name: '打赏动态', exact: true });
      const positions = await page.evaluate(() => {
        const rank = document
          .querySelector('section[aria-label="排行榜"]')!
          .getBoundingClientRect();
        const activity = document
          .querySelector('section[aria-label="打赏动态"]')!
          .getBoundingClientRect();
        return {
          rankBottom: rank.bottom,
          rankRight: rank.right,
          activityTop: activity.top,
          activityLeft: activity.left,
        };
      });
      if (isMobile) expect(positions.activityTop).toBeGreaterThanOrEqual(positions.rankBottom);
      else expect(positions.activityLeft).toBeGreaterThanOrEqual(positions.rankRight + 16);
      await expect(page.getByText('服务返回的金额异常')).toHaveCount(0);
      await expect(page.getByRole('button', { name: /[上下]一页(榜单|动态)/ })).toHaveCount(0);
      await page.screenshot({ path: info.outputPath('ready.png') });
      const rankScroll = rank.getByRole('region', { name: '赞助排名滚动区', exact: true });
      await rankScroll.focus();
      await page.keyboard.press('End');
      await expect(rank.getByRole('alert')).toBeVisible();
      await expect(rank.getByRole('listitem')).toHaveCount(20);
      expect(rankPages).toEqual([1, 2]);
      await page.screenshot({ path: info.outputPath('append-error.png') });
      failMore = false;
      await rank.getByRole('button', { name: '重试榜单' }).click();
      await expect(rank.getByRole('listitem')).toHaveCount(40);
      await rankScroll.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await expect(rank.getByRole('listitem')).toHaveCount(41);
      await expect(rank.getByText('已全部加载，共 41 条')).toBeVisible();
      expect(rankPages).toEqual([1, 2, 2, 3]);
      await expect(podium.getByRole('listitem')).toHaveCount(3);
      await expect(rank.getByRole('list', { name: '赞助排名列表' })).toHaveAttribute('start', '4');
      await activity.scrollIntoViewIfNeeded();
      const activityScroll = activity.getByRole('region', { name: '打赏动态记录', exact: true });
      for (const fraction of [0, 0.5, 1]) {
        await activityScroll.hover();
        await activityScroll.evaluate((el, part) => {
          el.scrollTop = (el.scrollHeight - el.clientHeight) * part;
        }, fraction);
        const spacing = await activityScroll.evaluate((el) => {
          const body = el.querySelector('[class*="activityBody"]')!.getBoundingClientRect();
          return {
            gap: el.getBoundingClientRect().right - body.right,
            overflow: el.scrollWidth - el.clientWidth,
          };
        });
        expect(spacing.gap).toBeGreaterThanOrEqual(isMobile ? 20 : 24);
        expect(spacing.overflow).toBeLessThanOrEqual(1);
        await page.screenshot({ path: info.outputPath(`activity-${fraction}.png`) });
      }
      for (let pass = 0; pass < 5; pass++) {
        const before = await activity.getByRole('listitem').count();
        if (before >= 41) break;
        await activityScroll.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        await expect.poll(() => activity.getByRole('listitem').count()).toBeGreaterThan(before);
      }
      await expect(activity.getByRole('listitem')).toHaveCount(41);
      await activityScroll.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await expect(activity.getByText('已全部加载，共 41 条')).toBeVisible();
      for (const [label, path] of [
        ['外卖福利', '/rank/welfare'],
        ['共建与反馈', '/rank/about'],
        ['其他产品', '/rank/other'],
      ] as const) {
        const link = nav.getByRole('link', { name: label, exact: true });
        await link.focus();
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(path);
        await expect(link).toHaveAttribute('aria-current', 'page');
        await expect(nav.getByRole('link')).toHaveCount(5);
        expect(await nav.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        await page.screenshot({ path: info.outputPath(`${path.split('/').pop()}.png`) });
      }
      await expect(nav.getByRole('link', { name: '狠狠点个 star', exact: true })).toHaveAttribute(
        'href',
        'https://github.com/lhccong/fish-island-backend',
      );
      state = 'empty';
      await nav.getByRole('link', { name: '赞助榜', exact: true }).click();
      await expect(page.getByText('暂无打赏记录', { exact: true })).toHaveCount(2);
      await page.screenshot({ path: info.outputPath('empty.png') });
      await nav.getByRole('link', { name: '其他产品', exact: true }).click();
      state = 'error';
      await nav.getByRole('link', { name: '赞助榜', exact: true }).click();
      await expect(page.getByRole('alert')).toHaveCount(2);
      await page.screenshot({ path: info.outputPath('error.png') });
      state = 'ready';
      await page.getByRole('button', { name: '重试榜单' }).click();
      await page.getByRole('button', { name: '重试动态' }).click();
      await expect(rank.getByRole('listitem')).toHaveCount(20);
      if (!isMobile) {
        const before = requests;
        await page.getByRole('button', { name: '切换主题', exact: true }).click();
        const picker = page.getByRole('dialog', { name: '主题模式' });
        await picker
          .getByRole('button', { name: mode === 'light' ? '暗夜模式' : '明亮模式', exact: true })
          .click();
        await picker
          .getByRole('button', { name: mode === 'light' ? '明亮模式' : '暗夜模式', exact: true })
          .click();
        await page.keyboard.press('Escape');
        expect(requests).toBe(before);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
      await page.goto('/about');
      await expect(page).toHaveURL('/rank/reward');
      await expect(nav.getByRole('link', { name: '赞助榜', exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      );
    });
  }
