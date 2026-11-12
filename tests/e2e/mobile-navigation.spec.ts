import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: outer tabs, inner return and appearance`, async ({ page }, info) => {
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skin: skin.id, mode },
      );
      await page.route('**/api/**', (route) => route.abort());
      let phase = 'loading';
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('**/api/hot/list', async (route) => {
        if (phase === 'loading') await pending;
        await route.fulfill({
          status: phase === 'error' ? 503 : 200,
          json: {
            code: 0,
            data:
              phase === 'success'
                ? [
                    {
                      id: '1',
                      name: '合成热榜',
                      categoryName: '综合',
                      data: Array.from({ length: 48 }, (_, index) => ({
                        title: index === 0 ? '合成条目' : `合成条目${index + 1}`,
                        url: `https://example.com/${index}`,
                      })),
                    },
                  ]
                : [],
          },
        });
      });
      await page.goto('/');
      const mobile = page.viewportSize()!.width <= 760;
      const rail = page.getByRole('complementary', { name: '应用导航', exact: true });
      const check = async () => {
        await expect(rail).toBeVisible();
        const bounds = (await rail.boundingBox())!;
        const main = (await page.locator('#main-content').boundingBox())!;
        if (mobile) {
          expect(bounds.y).toBeGreaterThan(page.viewportSize()!.height - 100);
          expect(main.y + main.height).toBeLessThanOrEqual(bounds.y + 1);
          for (const name of ['热榜', '聊天', '发现']) {
            const link = rail.getByRole('link', { name, exact: true });
            await expect(link).toBeVisible();
            expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
          }
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      };
      await expect(page.getByText('正在获取各平台热榜…')).toBeVisible();
      await check();
      phase = 'empty';
      release();
      await expect(page.getByText('暂时没有热榜内容')).toBeVisible();
      await check();
      phase = 'error';
      await page.getByRole('button', { name: '刷新热榜', exact: true }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      await check();
      phase = 'success';
      await page.getByRole('button', { name: '重试', exact: true }).click();
      await expect(page.getByRole('link', { name: '合成条目', exact: true })).toBeVisible();
      await check();
      const scroll = page.getByRole('region', {
        name: skin.id === 'wps' ? '主内容滚动区' : '合成热榜榜单滚动区',
        exact: true,
      });
      await scroll.focus();
      await scroll.press('End');
      await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      await scroll.evaluate((el) => {
        el.scrollTop = 0;
      });
      await scroll.hover();
      const track = scroll.locator('..').locator('[data-orientation="vertical"]');
      await expect(track).toHaveCount(1);
      await expect(track).toHaveCSS('visibility', mobile ? 'hidden' : 'visible');
      if (mobile) {
        const bounds = (await scroll.boundingBox())!;
        const cdp = await page.context().newCDPSession(page);
        const x = bounds.x + bounds.width / 2;
        const y = Math.min(bounds.y + bounds.height - 24, page.viewportSize()!.height - 110);
        await cdp.send('Input.synthesizeScrollGesture', {
          x,
          y,
          yDistance: -160,
          gestureSourceType: 'touch',
          preventFling: true,
        });
        await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
        await cdp.detach();
        await scroll.evaluate((el) => {
          el.scrollTop = 0;
        });
      }
      if (mobile) {
        const account = page.getByRole('button', { name: '登录', exact: true });
        await expect(account).toBeVisible();
        const avatar = (await account.boundingBox())!;
        expect(avatar.x).toBeGreaterThan(page.viewportSize()!.width - 80);
        expect(avatar.y).toBeLessThan(12);
        await expect(
          rail.getByRole('button', { name: '登录', exact: true, includeHidden: true }),
        ).toBeHidden();
        await expect(page.getByText('鱼岛 · 热榜', { exact: true })).toBeHidden();
        await account.tap();
        await expect(page.getByRole('dialog', { name: '摸鱼岛', exact: true })).toBeVisible();
        await page.getByRole('button', { name: '关闭登录弹窗' }).tap();
      }
      await page.screenshot({ path: info.outputPath('outer-tabs.png') });
      await page.getByRole('button', { name: '切换主题', exact: true }).click();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: '切换主题', exact: true })).toBeFocused();
      if (mobile) {
        if (skin.id !== 'wps') {
          await page.getByRole('button', { name: '查看合成热榜消息' }).tap();
          await expect(rail).toBeHidden();
          await page.getByRole('button', { name: '返回全部热榜' }).tap();
          await expect(rail).toBeVisible();
        }
        await rail.getByRole('link', { name: '发现', exact: true }).tap();
        await expect(page).toHaveURL('/discover');
        await expect(page.getByRole('heading', { name: '发现', level: 1 })).toBeVisible();
        await check();
        await page
          .getByRole('navigation', { name: '发现菜单' })
          .getByRole('link', { name: '游戏', exact: true })
          .tap();
        await expect(rail).toBeHidden();
        await expect(page.getByRole('link', { name: '返回发现' })).toBeVisible();
        await page.screenshot({ path: info.outputPath('inner-back.png') });
        await page.getByRole('link', { name: '返回发现' }).tap();
        await expect(page).toHaveURL('/discover');
      }
    });
  }
