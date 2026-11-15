import { expect, test, type Route } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(60_000);
const data = {
  id: '456',
  userName: '合成岛友',
  userAvatar: 'https://menu.test/image.png',
  momentsBgUrl: 'https://menu.test/image.png',
  userProfile: '合成简介用于验证长内容。'.repeat(30),
  points: 2769,
  level: 6,
  followerCount: '5',
  followingCount: '0',
  region: '合成地区',
  titleId: 1,
};
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: user card states, actions, scrolling and focus`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode);
      await page.route('**/api/userRemark/get', (route) =>
        route.fulfill({ json: { code: 0, data: { content: '{}' } } }),
      );
      await page.route('**/api/userRemark/save', (route) =>
        route.fulfill({ json: { code: 0, data: true } }),
      );
      let read: Route | undefined;
      let reads = 0;
      let followReadFails = false;
      let followFails = true;
      let following = false;
      await page.route('**/api/user/get/vo?*', (route) => {
        read = route;
        reads++;
      });
      await page.route('**/api/follow/is-following?*', (route) =>
        route.fulfill({ json: { code: followReadFails ? 50000 : 0, data: following } }),
      );
      let followWrite: Route | undefined;
      await page.route('**/api/follow/toggle?*', (route) => {
        followWrite = route;
      });
      fixture.push('7001', '用户卡片验证');
      const input = page.getByRole('textbox', { name: '消息草稿', exact: true });
      await input.fill('卡片操作保留草稿');
      const name = page
        .locator('[data-message-id="7001"]')
        .getByRole('button', { name: '查看合成岛友的用户卡片' });
      const click = async () => (page.viewportSize()!.width <= 760 ? name.tap() : name.click());
      await click();
      const card = page.getByRole('dialog', { name: '用户卡片', exact: true });
      await expect(card.getByText('正在读取用户资料…')).toBeVisible();
      await expect.poll(() => Boolean(read)).toBe(true);
      await read!.fulfill({ json: { code: 50000, message: '合成读取失败' } });
      await expect(card.getByRole('alert')).toHaveText('合成读取失败');
      await card.getByRole('button', { name: '重试资料' }).click();
      await expect.poll(() => reads).toBe(2);
      await read!.fulfill({ json: { code: 0, data: null } });
      await expect(card.getByText('该用户资料暂不可用')).toBeVisible();
      await card.getByRole('button', { name: '重新读取' }).click();
      await expect.poll(() => reads).toBe(3);
      await read!.fulfill({ json: { code: 0, data } });
      await expect(card.getByRole('heading', { name: '合成岛友' })).toBeVisible();
      await expect(card.getByRole('button', { name: '管理员操作', exact: true })).toHaveCount(0);
      await expect(card.getByText('0', { exact: true })).toBeVisible();
      await expect(card.getByText('5', { exact: true })).toBeVisible();
      const scroll = card.getByRole('region', { name: '用户卡片内容' });
      const cover = card.getByRole('img', { name: '合成岛友的封面', exact: true });
      const coverBox = (await cover.boundingBox())!;
      const scrollBox = (await scroll.boundingBox())!;
      expect(await cover.evaluate((el) => getComputedStyle(el).objectFit)).toBe('cover');
      if (page.viewportSize()!.width > 760) {
        expect((await card.boundingBox())!.width).toBe(680);
        const dialogBox = (await card.boundingBox())!;
        expect(coverBox.width).toBeGreaterThanOrEqual(450);
        expect(coverBox.width / dialogBox.width).toBeGreaterThan(0.66);
        expect(
          Math.abs(coverBox.x + coverBox.width - (dialogBox.x + dialogBox.width)),
        ).toBeLessThanOrEqual(1);
        expect(Math.abs(coverBox.height - scrollBox.height)).toBeLessThanOrEqual(1);
        expect(Math.abs(coverBox.y - scrollBox.y)).toBeLessThanOrEqual(1);
        expect(coverBox.x).toBeGreaterThanOrEqual(scrollBox.x + scrollBox.width);
      } else {
        expect(coverBox.height).toBe(140);
        expect(scrollBox.y).toBeGreaterThanOrEqual(coverBox.y + coverBox.height);
      }
      const layout = await scroll.evaluate((el) => {
        const body = el.firstElementChild!.firstElementChild!;
        const a = el.getBoundingClientRect();
        const b = body.firstElementChild!.getBoundingClientRect();
        return {
          gap: a.right - b.right,
          top: b.top - a.top,
          overflow: el.scrollWidth - el.clientWidth,
        };
      });
      expect(layout.gap).toBeGreaterThanOrEqual(page.viewportSize()!.width <= 760 ? 20 : 24);
      expect(layout.top).toBeGreaterThanOrEqual(4);
      expect(layout.overflow).toBeLessThanOrEqual(1);
      await scroll.hover();
      await page.screenshot({ path: info.outputPath('user-card-top.png') });
      await card.getByRole('button', { name: '关注', exact: true }).click();
      await expect(card.getByRole('button', { name: '处理中…' })).toBeDisabled();
      await expect.poll(() => Boolean(followWrite)).toBe(true);
      await followWrite!.fulfill({ json: { code: 50000, message: '合成关注失败' } });
      await expect(card.getByRole('alert')).toHaveText('合成关注失败');
      followFails = false;
      followWrite = undefined;
      await card.getByRole('button', { name: '关注', exact: true }).click();
      await expect.poll(() => Boolean(followWrite)).toBe(true);
      following = !followFails;
      await followWrite!.fulfill({ json: { code: 0, data: following } });
      await expect(card.getByRole('button', { name: '取消关注' })).toBeEnabled();
      await expect(card.getByRole('status')).toHaveText('已关注');
      await expect(card.getByText('6', { exact: true })).toHaveCount(2);
      await card.getByRole('button', { name: '设置备注', exact: true }).click();
      const remark = page.getByRole('dialog', { name: '设置备注', exact: true });
      const remarkInput = remark.getByRole('textbox', { name: '备注名称' });
      // A previously failed initial remarks load must remain explicitly retryable.
      const retry = remark.getByRole('button', { name: '重试加载备注' });
      if (await retry.count()) await retry.click();
      await expect(remarkInput).toBeEnabled();
      await remarkInput.fill('合成备注');
      await remark.getByRole('button', { name: '保存', exact: true }).click();
      await expect(remark.getByRole('status')).toHaveText('备注已保存');
      await remark.getByRole('button', { name: '关闭', exact: true }).click();
      await expect(card.getByRole('button', { name: '修改备注' })).toBeFocused();
      await expect(card.getByRole('heading', { name: '合成备注' })).toBeVisible();
      await scroll.evaluate((el) => {
        el.scrollTop = el.scrollHeight / 2;
      });
      await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      await page.screenshot({ path: info.outputPath('user-card-middle.png') });
      await scroll.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await card.getByRole('button', { name: '动态', exact: true }).focus();
      await expect(card.getByRole('button', { name: '动态', exact: true })).toBeInViewport();
      await page.screenshot({ path: info.outputPath('user-card-bottom.png') });
      await card.getByRole('button', { name: '加入黑名单' }).click();
      await card.getByRole('button', { name: '确认加入' }).click();
      await expect(card.getByRole('status')).toContainText('已在此浏览器屏蔽');
      await card.getByRole('button', { name: '移出黑名单' }).click();
      await expect(card.getByRole('status')).toHaveText('已移出黑名单');
      await card.getByRole('button', { name: '关闭用户卡片' }).click();
      await expect(input).toBeFocused();
      await expect(input).toHaveText('卡片操作保留草稿');
      expect(fixture.stats().connections).toBe(1);
      expect(fixture.stats().historyRequests).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      // No cover, missing fields, and failed relationship lookup must stay honest and recoverable.
      read = undefined;
      followReadFails = true;
      await click();
      await expect.poll(() => reads).toBe(4);
      await read!.fulfill({ json: { code: 0, data: { id: '456', userName: '合成岛友' } } });
      await expect(card.getByRole('heading', { name: '合成备注' })).toBeVisible();
      await expect(card.getByRole('button', { name: '关注', exact: true })).toBeDisabled();
      await expect(card.getByRole('button', { name: '重试关注状态' })).toBeVisible();
      await expect(card.getByText('未提供', { exact: true })).toHaveCount(3);
      const compactBox = (await card.boundingBox())!;
      if (page.viewportSize()!.width > 760) expect(compactBox.width).toBe(420);
      expect(compactBox.height).toBeLessThan(page.viewportSize()!.height - 32);
      await expect(card.getByRole('button', { name: '宠物', exact: true })).toHaveText('宠物');
      followReadFails = false;
      await card.getByRole('button', { name: '重试关注状态' }).click();
      await expect.poll(() => reads).toBe(5);
      await read!.fulfill({
        json: {
          code: 0,
          data: {
            id: '456',
            userName: '合成岛友',
            userProfile: '在岛上摸鱼',
            level: 5,
            followingCount: '1',
            followerCount: '8',
          },
        },
      });
      await expect(card.getByRole('button', { name: '取消关注', exact: true })).toBeEnabled();
      await card.getByRole('button', { name: '动态', exact: true }).focus();
      await expect(card.getByRole('button', { name: '动态', exact: true })).toBeInViewport();
      const lastAction = (await card
        .getByRole('button', { name: '动态', exact: true })
        .boundingBox())!;
      const close = (await card.getByRole('button', { name: '关闭', exact: true }).boundingBox())!;
      expect(close.y - lastAction.y - lastAction.height).toBeLessThanOrEqual(56);
      await page.screenshot({ path: info.outputPath('compact-card.png') });
      await page.keyboard.press('Escape');
      await expect(name).toBeFocused();
    });
  }
