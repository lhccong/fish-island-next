import { expect, test, type Locator, type Route } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
test.setTimeout(60_000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: admin moderation, touch scroll, theme preservation`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode, 'admin');
      const mobile = page.viewportSize()!.width <= 760;
      const activate = (control: Locator) => (mobile ? control.tap() : control.click());
      async function scrollDown(region: Locator) {
        const scrollbar = region.locator('..').locator('[data-orientation="vertical"]');
        if (mobile) {
          await expect(scrollbar).toHaveCSS('visibility', 'hidden');
          const rect = (await region.boundingBox())!;
          const client = await page.context().newCDPSession(page);
          const x = rect.x + rect.width / 2;
          const y = rect.y + rect.height - 20;
          await client.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y }],
          });
          for (let step = 1; step <= 10; step++) {
            await client.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x, y: y - step * 25 }],
            });
            await page.evaluate(() => new Promise(requestAnimationFrame));
          }
          await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await client.detach();
        } else {
          await region.hover();
          await expect(scrollbar).toHaveCSS('opacity', '1');
          await page.mouse.wheel(0, 600);
        }
        await expect.poll(() => region.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      }
      let muted = false;
      let firstRead: Route | undefined;
      let firstWrite: Route | undefined;
      let reads = 0;
      let muteReads = 0;
      const writes: unknown[] = [];
      await page.route('**/api/user/get/vo?*', (route) => {
        reads++;
        return route.fulfill({
          json: {
            code: 0,
            data: {
              id: '456',
              userName: '合成岛友',
              userProfile: '用于滚动与间距验证的合成简介。'.repeat(80),
            },
          },
        });
      });
      await page.route('**/api/follow/is-following?*', (route) =>
        route.fulfill({ json: { code: 0, data: false } }),
      );
      await page.route('**/api/user/mute/info?*', (route) => {
        muteReads++;
        if (muteReads === 1) {
          firstRead = route;
          return;
        }
        return route.fulfill({
          json: { code: 0, data: { isMuted: muted, remainingTime: '10分钟' } },
        });
      });
      await page.route('**/api/user/mute/add', (route) => {
        writes.push(route.request().postDataJSON());
        if (writes.length === 1) {
          firstWrite = route;
          return;
        }
        muted = true;
        return route.fulfill({ json: { code: 0, data: true } });
      });
      await page.route('**/api/user/mute/remove?*', (route) => {
        expect(new URL(route.request().url()).searchParams.get('userId')).toBe('456');
        expect(route.request().method()).toBe('POST');
        muted = false;
        return route.fulfill({ json: { code: 0, data: true } });
      });
      fixture.push('8001', '合成管理员验证');
      await page.getByRole('textbox', { name: '消息草稿' }).fill('管理员草稿');
      const name = page
        .locator('[data-message-id="8001"]')
        .getByRole('button', { name: '查看合成岛友的用户卡片' });
      await name.click();
      const dialog = page.getByRole('dialog', { name: '用户卡片', exact: true });
      const region = dialog.getByRole('region', { name: '用户卡片内容' });
      await expect(dialog.getByRole('heading', { name: '合成岛友' })).toBeVisible();
      const gear = dialog.getByRole('button', { name: '管理员操作', exact: true });
      const moderation = page.getByRole('dialog', { name: '管理员操作', exact: true });
      const dismiss = moderation.getByRole('button', { name: '关闭管理员操作', exact: true });
      await expect(gear).toHaveAttribute('aria-haspopup', 'dialog');
      await expect(gear).toHaveAttribute('aria-expanded', 'false');
      expect(muteReads).toBe(0);
      await expect(moderation).toHaveCount(0);
      await dialog.getByRole('button', { name: '复制ID' }).click();
      expect(await fixture.clipboardText()).toBe('456');
      const gearAtTop = await gear.boundingBox();
      await scrollDown(region);
      expect(await gear.boundingBox()).toEqual(gearAtTop);

      await activate(gear);
      const body = moderation.getByRole('region', { name: '禁言设置', exact: true });
      const loading = moderation.getByText('正在读取禁言状态…');
      await expect(loading).toBeVisible();
      await expect.poll(() => !!firstRead).toBe(true);
      await firstRead!.fulfill({
        json: { code: 50000, message: '用于滚动验收的合成状态读取失败。'.repeat(110) },
      });
      const retry = moderation.getByRole('button', { name: '重试禁言状态' });
      await expect(retry).toBeVisible();
      await scrollDown(body);
      await activate(dismiss);
      await expect(moderation).toHaveCount(0);
      await expect(gear).toBeFocused();
      const scrollBeforeReopen = await region.evaluate((el) => el.scrollTop);
      expect(scrollBeforeReopen).toBeGreaterThan(0);
      await gear.press('Enter');
      await expect(retry).toBeVisible();
      expect(muteReads).toBe(1);
      await activate(retry);
      const select = moderation.getByRole('combobox', { name: '禁言时长' });
      await expect(body).toHaveCSS('padding-right', mobile ? '20px' : '24px');
      await activate(select);
      await activate(page.getByRole('option', { name: '10 分钟', exact: true }));
      await expect(select).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(gear).toBeFocused();
      expect(await region.evaluate((el) => el.scrollTop)).toBe(scrollBeforeReopen);
      await activate(gear);
      await expect(select).toHaveText('10 分钟');
      expect(muteReads).toBe(2);
      await activate(select);
      await page.keyboard.press('Escape');
      await expect(select).toBeFocused();
      await page.evaluate(
        async ({ skin, mode }) => {
          const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
          useAppearanceStore.getState().setSkinId(skin as never);
          useAppearanceStore.getState().setColorMode(mode as never);
        },
        { skin: skin.id === 'wps' ? 'wechat' : 'wps', mode: mode === 'light' ? 'dark' : 'light' },
      );
      await expect(select).toHaveText('10 分钟');
      expect(reads).toBe(1);
      expect(muteReads).toBe(2);
      await activate(moderation.getByRole('button', { name: '禁言用户', exact: true }));
      const confirm = moderation.getByRole('button', { name: '确认', exact: true });
      await activate(confirm);
      await expect(select).toBeDisabled();
      await expect(moderation.getByRole('button').filter({ hasText: '提交中…' })).toBeDisabled();
      await expect.poll(() => !!firstWrite).toBe(true);
      await firstWrite!.fulfill({ json: { code: 50000, message: '合成禁言失败' } });
      await expect(moderation.getByRole('alert')).toHaveText('合成禁言失败');
      await activate(confirm);
      const unmute = moderation.getByRole('button', { name: '解除禁言', exact: true });
      await expect(unmute).toBeVisible();
      expect(writes).toEqual([
        { userId: '456', duration: 600 },
        { userId: '456', duration: 600 },
      ]);
      await activate(unmute);
      await activate(confirm);
      await expect(select).toBeVisible();
      await page.screenshot({ path: info.outputPath('moderation.png') });
      expect(await body.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
      await page.keyboard.press('Escape');
      await expect(gear).toBeFocused();
      expect(await region.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
      await page.keyboard.press('Escape');
      await expect(name).toBeFocused();
      await expect(page.getByRole('textbox', { name: '消息草稿' })).toHaveText('管理员草稿');
      expect(fixture.stats().connections).toBe(1);
    });
  }
