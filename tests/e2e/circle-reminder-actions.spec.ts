import { expect, test, type Locator, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { noOverflow, setup } from './fish-circle-fixture';

const follower = '90071992547409921';
const detected = '90071992547409922';
const legacy = '90071992547409923';
const system = { state: 1, sourceType: 0, senderId: '-1' };

async function mockReminders(page: Page) {
  await page.route('**/api/event_remind/**', (route) =>
    route.fulfill({
      json: {
        code: 0,
        data: route.request().url().endsWith('/count')
          ? 0
          : {
              total: 4,
              records: [
                {
                  ...system,
                  id: '1',
                  action: 'follow',
                  sourceType: 3,
                  senderId: follower,
                  senderUser: { userName: '合成关注用户' },
                  sourceContent: '有人关注了你',
                },
                {
                  ...system,
                  id: '2',
                  action: 'script_detection',
                  sourceId: detected,
                  sourceContent: '检测到可能的脚本用户',
                },
                {
                  ...system,
                  id: '3',
                  action: 'system',
                  sourceId: '-1',
                  sourceContent: `检测到用户 合成用户:${legacy} 今日快速抢包次数达到 6 次，已标记为脚本用户`,
                },
                {
                  ...system,
                  id: '4',
                  action: 'follow',
                  sourceType: 3,
                  sourceContent: '缺少关注者的历史通知',
                },
              ],
            },
      },
    }),
  );
}

async function openReminder(page: Page, content: string | RegExp) {
  await page.getByRole('button', { name: '消息通知', exact: true }).click();
  await page.getByRole('dialog', { name: '全部互动消息' }).getByText(content).click();
  const detail = page.getByRole('region', { name: '通知详情', exact: true });
  await expect(detail).toBeVisible();
  return detail;
}

async function activate(button: Locator, touch: boolean) {
  if (touch) await button.tap();
  else await button.click();
}

async function assertButtonLayout(button: Locator, touch: boolean) {
  expect(await button.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(
    touch ? 44 : 32,
  );
}

async function assertDetailLayout(detail: Locator) {
  const viewport = detail.getByRole('region', { name: '通知详情内容', exact: true });
  expect(await viewport.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode} follow and moderation notification actions`, async ({
      page,
      hasTouch,
    }, info) => {
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skin: skin.id, mode },
      );
      await setup(page);
      await mockReminders(page);
      const touch = hasTouch ?? false;
      let following = false;
      let followedBy = true;
      let followReads = 0;
      let followWrites = 0;
      let profileReads = 0;
      let scriptWrites = 0;
      await page.route('**/api/follow/is-following?*', async (route) => {
        const params = new URL(route.request().url()).searchParams;
        expect(params.get('followUserId')).toBe(follower);
        expect(params.get('includeIncoming')).toBe('true');
        followReads++;
        if (followReads === 1) {
          await expect(page.getByText('正在读取关注状态…')).toBeVisible();
          return route.fulfill({ json: { code: 40000, message: '关注状态读取失败' } });
        }
        return route.fulfill({ json: { code: 0, data: { following, followedBy } } });
      });
      await page.route('**/api/follow/add?*', async (route) => {
        expect(route.request().method()).toBe('POST');
        expect(new URL(route.request().url()).searchParams.get('followUserId')).toBe(follower);
        followWrites++;
        if (followWrites === 1)
          return route.fulfill({ json: { code: 40000, message: '暂时无法关注' } });
        following = true;
        return route.fulfill({ json: { code: 0, data: true } });
      });
      await page.route('**/api/follow/toggle?*', (route) => {
        expect(following).toBe(true);
        following = false;
        return route.fulfill({ json: { code: 0, data: false } });
      });
      await page.route(`**/api/user/get/vo?id=${follower}`, async (route) => {
        profileReads++;
        if (profileReads === 1) await expect(page.getByText('正在读取用户资料…')).toBeVisible();
        return route.fulfill({
          json: {
            code: 0,
            data: profileReads === 1 ? null : { id: follower, userName: '合成关注用户', level: 3 },
          },
        });
      });
      await page.route('**/api/redpacket/script/mark?*', async (route) => {
        expect(route.request().method()).toBe('POST');
        const params = new URL(route.request().url()).searchParams;
        expect(params.get('userId')).toBe(scriptWrites === 2 ? legacy : detected);
        expect(params.get('mark')).toBe('false');
        scriptWrites++;
        await expect(page.getByText('正在解除…')).toBeVisible();
        return route.fulfill({
          json:
            scriptWrites === 1
              ? { code: 40000, message: '解除失败，请重试' }
              : { code: 0, data: true },
        });
      });
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
      const detail = await openReminder(page, '有人关注了你');
      await expect(detail.getByRole('alert')).toHaveText('关注状态读取失败');
      await activate(detail.getByRole('button', { name: '重试关注状态' }), touch);
      const view = detail.getByRole('button', { name: '查看用户信息' });
      const follow = detail.getByRole('button', { name: '回关' });
      await expect(follow).toBeEnabled();
      await assertButtonLayout(view, touch);
      await assertButtonLayout(follow, touch);
      const messageBox = (await detail.getByText('有人关注了你').boundingBox())!;
      const viewBox = (await view.boundingBox())!;
      if (touch) expect(viewBox.y).toBeGreaterThan(messageBox.y + messageBox.height);
      else expect(Math.abs(viewBox.y - messageBox.y)).toBeLessThan(2);
      await assertDetailLayout(detail);
      if (!touch) {
        await follow.hover();
        await follow.focus();
        await page.keyboard.press('Shift+Tab');
        await expect(view).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(follow).toBeFocused();
      }
      if (skin.id === 'moyu-island') await page.screenshot({ path: info.outputPath('follow.png') });
      await activate(view, touch);
      const card = page.getByRole('dialog', { name: '用户卡片' });
      await expect(card.getByText('该用户资料暂不可用')).toBeVisible();
      await activate(card.getByRole('button', { name: '重新读取' }), touch);
      await expect(card.getByText('合成关注用户', { exact: true })).toBeVisible();
      const cardFollow = card.getByRole('button', { name: '回关' });
      await expect(cardFollow).toBeEnabled();
      await assertButtonLayout(cardFollow, touch);
      if (skin.id === 'moyu-island') await page.screenshot({ path: info.outputPath('card.png') });
      await noOverflow(page);
      if (touch) await activate(card.getByRole('button', { name: '关闭用户卡片' }), touch);
      else await page.keyboard.press('Escape');
      await expect(view).toBeFocused();
      await expect(follow).toBeEnabled();
      await activate(follow, touch);
      await expect(detail.getByRole('alert')).toHaveText('暂时无法关注');
      await activate(follow, touch);
      await expect(detail.getByRole('status').filter({ hasText: '已关注' })).toBeVisible();
      if (!touch && skin.id === 'moyu-island' && mode === 'light') {
        const readsBeforeThemeChange = followReads;
        for (const [theme, colorMode] of [
          ['企业微信', '暗夜模式'],
          ['摸鱼岛', '明亮模式'],
        ]) {
          await page.getByRole('button', { name: '切换主题', exact: true }).click();
          const themePicker = page.getByRole('dialog', { name: '主题模式' });
          await themePicker.getByRole('button', { name: theme, exact: true }).click();
          await themePicker.getByRole('button', { name: colorMode, exact: true }).click();
          await themePicker.getByRole('button', { name: '关闭', exact: true }).click();
          await expect(detail.getByRole('status').filter({ hasText: '已关注' })).toBeVisible();
          expect(followReads).toBe(readsBeforeThemeChange);
        }
      }
      await activate(view, touch);
      const unfollow = card.getByRole('button', { name: '取消关注' });
      await activate(unfollow, touch);
      await expect(cardFollow).toBeEnabled();
      await activate(cardFollow, touch);
      await expect(unfollow).toBeEnabled();
      await activate(unfollow, touch);
      await expect(cardFollow).toBeEnabled();
      followedBy = false;
      await activate(card.getByRole('button', { name: '关闭', exact: true }), touch);
      await expect(detail.getByRole('button', { name: '关注', exact: true })).toBeEnabled();
      expect(followWrites).toBe(3);
      await noOverflow(page);
      const back = detail.getByRole('button', { name: '返回鱼小圈' });
      await activate(back, touch);

      await openReminder(page, '检测到可能的脚本用户');
      const release = detail.getByRole('button', { name: '解除误封' });
      await assertButtonLayout(release, touch);
      if (skin.id === 'moyu-island') await page.screenshot({ path: info.outputPath('script.png') });
      const confirmation = page.getByRole('dialog', { name: '解除误封' });
      await activate(release, touch);
      await expect(confirmation.getByText(detected, { exact: false })).toBeVisible();
      await activate(confirmation.getByRole('button', { name: '取消', exact: true }), touch);
      await expect(release).toBeFocused();
      expect(scriptWrites).toBe(0);
      for (let attempt = 0; attempt < 2; attempt++) {
        await activate(release, touch);
        await activate(confirmation.getByRole('button', { name: '确认解除' }), touch);
        if (attempt === 0) await expect(detail.getByRole('alert')).toHaveText('解除失败，请重试');
      }
      await expect(detail.getByRole('button', { name: '已解除脚本标记' })).toBeDisabled();
      await expect(detail.getByRole('button', { name: '已解除脚本标记' })).toBeFocused();
      expect(scriptWrites).toBe(2);
      await noOverflow(page);
      await activate(back, touch);
      await openReminder(page, /今日快速抢包次数达到/);
      await assertDetailLayout(detail);
      await activate(release, touch);
      await expect(confirmation.getByText(legacy, { exact: false })).toBeVisible();
      await activate(confirmation.getByRole('button', { name: '确认解除' }), touch);
      await expect(detail.getByRole('button', { name: '已解除脚本标记' })).toBeDisabled();
      await activate(back, touch);
      await openReminder(page, '缺少关注者的历史通知');
      await expect(view).toHaveCount(0);
      await expect(follow).toHaveCount(0);
    });
  }

test('ordinary users do not get the script release action', async ({ page }) => {
  await setup(page, false, { role: 'user' });
  await mockReminders(page);
  const detail = await openReminder(page, '检测到可能的脚本用户');
  await expect(detail.getByRole('button', { name: '解除误封' })).toHaveCount(0);
});
