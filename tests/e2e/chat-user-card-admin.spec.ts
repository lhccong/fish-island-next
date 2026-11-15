import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
test.setTimeout(60_000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: admin moderation, touch scroll, theme preservation`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode, 'admin');
      let muted = false;
      let failRead = true;
      let failWrite = true;
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
              userProfile: '用于滚动与间距验证的合成简介。'.repeat(24),
            },
          },
        });
      });
      await page.route('**/api/follow/is-following?*', (route) =>
        route.fulfill({ json: { code: 0, data: false } }),
      );
      await page.route('**/api/user/mute/info?*', (route) => {
        muteReads++;
        return route.fulfill({
          json: {
            code: failRead ? 50000 : 0,
            message: '合成状态读取失败',
            data: { isMuted: muted, remainingTime: '10分钟' },
          },
        });
      });
      await page.route('**/api/user/mute/add', (route) => {
        writes.push(route.request().postDataJSON());
        if (!failWrite) muted = true;
        return route.fulfill({
          json: { code: failWrite ? 50000 : 0, message: '合成禁言失败', data: !failWrite },
        });
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
      const disclosure = dialog.getByRole('button', { name: '管理员操作', exact: true });
      await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
      expect(muteReads).toBe(0);
      await expect(dialog.getByRole('combobox', { name: '禁言时长' })).toHaveCount(0);
      await dialog.getByRole('button', { name: '复制ID' }).click();
      expect(await fixture.clipboardText()).toBe('456');
      if (page.viewportSize()!.width <= 760) {
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
        await expect.poll(() => region.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
        await client.detach();
      } else {
        await region.hover();
        await page.mouse.wheel(0, 600);
      }
      await disclosure.click();
      await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
      // First expansion reads the current state; exercise an explicit retry after a failure.
      await expect(dialog.getByRole('button', { name: '重试禁言状态' })).toBeVisible();
      await disclosure.click();
      await expect(dialog.getByRole('button', { name: '重试禁言状态' })).toBeHidden();
      await disclosure.click();
      expect(muteReads).toBe(1);
      failRead = false;
      await dialog.getByRole('button', { name: '重试禁言状态' }).click();
      const select = dialog.getByRole('combobox', { name: '禁言时长' });
      await select.click();
      await page.getByRole('option', { name: '10 分钟', exact: true }).click();
      await expect(select).toBeFocused();
      await disclosure.click();
      await expect(select).toBeHidden();
      await disclosure.click();
      await expect(select).toHaveText('10 分钟');
      expect(muteReads).toBe(2);
      await select.click();
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
      await dialog.getByRole('button', { name: '禁言用户', exact: true }).click();
      await dialog.getByRole('button', { name: '确认', exact: true }).click();
      await expect(dialog.getByRole('alert')).toHaveText('合成禁言失败');
      failWrite = false;
      await dialog.getByRole('button', { name: '确认', exact: true }).click();
      await expect(dialog.getByRole('button', { name: '解除禁言' })).toBeVisible();
      expect(writes).toEqual([
        { userId: '456', duration: 600 },
        { userId: '456', duration: 600 },
      ]);
      await dialog.getByRole('button', { name: '解除禁言' }).click();
      await dialog.getByRole('button', { name: '确认', exact: true }).click();
      await expect(select).toBeVisible();
      await page.screenshot({ path: info.outputPath('moderation.png') });
      expect(await region.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
      await page.keyboard.press('Escape');
      await expect(name).toBeFocused();
      await expect(page.getByRole('textbox', { name: '消息草稿' })).toHaveText('管理员草稿');
      expect(fixture.stats().connections).toBe(1);
    });
  }
