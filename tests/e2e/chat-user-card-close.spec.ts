import { expect, test, type Route } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(60_000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: compact dismiss hit target, states and focus`, async ({
      page,
    }, info) => {
      const fixture = await setupChatMenu(page, skin.id, mode, 'admin');
      await page.route('https://menu.test/cover.png', (route) =>
        route.fulfill({
          path: 'public/skins/pixel-island/home-island.png',
          contentType: 'image/png',
        }),
      );
      await page.route('https://menu.test/cover-unavailable.png', (route) =>
        route.fulfill({ status: 404, body: 'Synthetic missing cover' }),
      );
      let state = 'loading';
      let pending: Route | undefined;
      await page.route('**/api/user/get/vo?*', (route) => {
        if (state === 'loading') {
          pending = route;
          return;
        }
        return route.fulfill({
          json: {
            code: state === 'error' ? 50000 : 0,
            message: '合成读取失败',
            data:
              state === 'empty'
                ? null
                : {
                    id: '456',
                    userName: '合成岛友',
                    userAvatar: 'https://menu.test/image.png',
                    followingCount: '1',
                    followerCount: '8',
                    level: 7,
                    country: '合成国家',
                    region: '合成省份',
                    titleId: 2,
                    titleIdList: '[1,2,7,11]',
                    userProfile:
                      state === 'long' ? '用于滚动的合成简介。'.repeat(80) : '在岛上摸鱼',
                    ...(state.startsWith('cover')
                      ? {
                          momentsBgUrl:
                            state === 'cover'
                              ? 'https://menu.test/cover.png'
                              : 'https://menu.test/cover-unavailable.png',
                        }
                      : {}),
                  },
          },
        });
      });
      await page.route('**/api/follow/is-following?*', (route) =>
        route.fulfill({ json: { code: 0, data: false } }),
      );
      await page.route('**/api/user/mute/info?*', (route) =>
        route.fulfill({ json: { code: 0, data: { isMuted: false } } }),
      );
      fixture.push('9501', '合成关闭入口验证');
      const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
      await draft.fill('关闭卡片保留草稿');
      const name = page
        .locator('[data-message-id="9501"]')
        .getByRole('button', { name: '查看合成岛友的用户卡片' });
      const dialog = page.getByRole('dialog', { name: '用户卡片', exact: true });
      const dismiss = dialog.getByRole('button', { name: '关闭用户卡片', exact: true });
      const gear = dialog.getByRole('button', { name: '管理员操作', exact: true });
      const mobile = page.viewportSize()!.width <= 760;
      for (const stage of ['loading', 'empty', 'error', 'ready', 'long', 'cover', 'cover-error']) {
        state = stage;
        await name.click();
        if (stage === 'loading') {
          await expect(dialog.getByText('正在读取用户资料…')).toBeVisible();
          await expect.poll(() => !!pending).toBe(true);
        } else if (stage === 'empty')
          await expect(dialog.getByText('该用户资料暂不可用')).toBeVisible();
        else if (stage === 'error')
          await expect(dialog.getByRole('alert')).toHaveText('合成读取失败');
        else await expect(dialog.getByRole('heading', { name: '合成岛友' })).toBeVisible();
        if (['loading', 'empty', 'error'].includes(stage)) await expect(gear).toHaveCount(0);
        if (stage === 'long') {
          await dialog.getByRole('region', { name: '用户卡片内容' }).evaluate((el) => {
            el.scrollTop = el.scrollHeight;
          });
        }
        const hit = await dismiss.evaluate((button) => {
          const box = button.getBoundingClientRect();
          const points = [
            [0.5, 0.5],
            [0.25, 0.25],
            [0.75, 0.75],
          ];
          return {
            width: box.width,
            height: box.height,
            reachable: points.every(([x, y]) => {
              const top = document.elementFromPoint(
                box.left + box.width * x!,
                box.top + box.height * y!,
              );
              return !!top && button.contains(top);
            }),
          };
        });
        expect(hit.width).toBeGreaterThanOrEqual(44);
        expect(hit.height).toBeGreaterThanOrEqual(44);
        expect(hit.reachable).toBe(true);
        if (stage === 'cover') {
          await expect(dialog.getByText('正在加载封面…')).toBeHidden();
          const details = dialog.locator('dl');
          await expect(details.locator('dt')).toHaveText(['等级', '地区']);
          const layout = await details.evaluate((row) => {
            const rowBox = row.getBoundingClientRect();
            const positions = Array.from(row.children, (item) => {
              const { top, left } = item.getBoundingClientRect();
              return { top, left, overflow: item.scrollWidth - item.clientWidth };
            });
            const first = row.firstElementChild!.getBoundingClientRect();
            const last = row.lastElementChild!.getBoundingClientRect();
            return { positions, balance: first.left - rowBox.left - (rowBox.right - last.right) };
          });
          expect(new Set(layout.positions.map(({ top }) => top)).size).toBe(1);
          expect(layout.positions[0]!.left).toBeLessThan(layout.positions[1]!.left);
          expect(layout.positions.every(({ overflow }) => overflow <= 1)).toBe(true);
          expect(Math.abs(layout.balance)).toBeLessThanOrEqual(1);
        }
        if (stage === 'cover-error')
          await expect(dialog.getByText('封面暂时无法显示')).toBeVisible();
        if (stage === 'ready' || stage === 'cover')
          await dialog.screenshot({ path: info.outputPath(`${stage}-dismiss.png`) });
        if (stage === 'long' || stage.startsWith('cover')) {
          const gearBox = (await gear.boundingBox())!;
          const dismissBox = (await dismiss.boundingBox())!;
          expect(gearBox.width).toBeGreaterThanOrEqual(44);
          expect(gearBox.height).toBeGreaterThanOrEqual(44);
          expect(gearBox.x + gearBox.width).toBeLessThan(dismissBox.x);
          expect(gearBox.y).toBe(dismissBox.y);
          if (mobile) await gear.tap();
          else await gear.click();
          const moderation = page.getByRole('dialog', { name: '管理员操作', exact: true });
          await expect(moderation.getByRole('combobox', { name: '禁言时长' })).toBeVisible();
          await page.keyboard.press('Escape');
          await expect(gear).toBeFocused();
        }
        if (mobile) await dismiss.tap();
        else await dismiss.click();
        await expect(dialog).toHaveCount(0);
        if (pending) {
          await pending.abort('aborted').catch(() => {});
          pending = undefined;
        }
        await expect(name).toBeFocused();
      }
      for (const key of ['Enter', 'Escape']) {
        state = 'ready';
        await name.click();
        await expect(dialog.getByRole('heading', { name: '合成岛友' })).toBeVisible();
        await dismiss.focus();
        await dismiss.press(key);
        await expect(dialog).toHaveCount(0);
        await expect(name).toBeFocused();
      }
      await expect(draft).toHaveText('关闭卡片保留草稿');
      expect(fixture.stats().connections).toBe(1);
    });
  }
