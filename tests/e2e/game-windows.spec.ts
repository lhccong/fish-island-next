import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { farmFixture } from './farm-fixture';
import { fixture } from './stock-fixture';

test.use({ hasTouch: true, actionTimeout: 10000 });
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390])
      test(`${skin.id} ${mode} ${width} 游戏浮窗`, async ({ page }, info) => {
        test.setTimeout(180000);
        const farm = await farmFixture(page);
        const stock = await fixture(page, true);
        await page.addInitScript(
          ({ skin, mode }) => {
            localStorage.setItem('fish-island:skin', skin);
            localStorage.setItem('fish-island:color-mode', mode);
          },
          { skin: skin.id, mode },
        );
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/discover/games');
        const play = async (name: string) => {
          const button = page.getByRole('button', { name: `独立窗口打开${name}`, exact: true });
          await expect(button).toHaveText('');
          const launchBox = (await button.boundingBox())!;
          expect(launchBox.width).toBeGreaterThanOrEqual(44);
          expect(launchBox.height).toBeGreaterThanOrEqual(44);
          if (width < 760) await button.tap();
          else await button.click();
          await expect(page).toHaveURL('/discover/games');
          return page.getByRole('dialog', { name, exact: true });
        };
        let win = await play('人生重开模拟器');
        await win.getByRole('button', { name: '立即重开', exact: true }).click();
        await expect(win.getByRole('heading', { name: '选择重开模式' })).toBeVisible();
        await win.getByRole('button', { name: '收起游戏窗口' }).click();
        await expect(win).toBeHidden();
        win = await play('摸鱼农场');
        await expect(win.getByRole('button', { name: /^1号地/ })).toBeVisible();
        const region = win.getByRole('region', { name: '摸鱼农场内容' });
        await region.hover();
        const layout = await region.evaluate((e) => {
          const child = e.firstElementChild!.firstElementChild!;
          const track = e.parentElement!.querySelector('[data-orientation="vertical"]');
          return {
            overflow: e.scrollWidth > e.clientWidth,
            gap: e.getBoundingClientRect().right - child.getBoundingClientRect().right,
            track: track ? getComputedStyle(track).visibility : 'hidden',
          };
        });
        expect(layout.overflow).toBe(false);
        expect(layout.gap).toBeGreaterThanOrEqual(width <= 760 ? 20 : 24);
        if (width <= 760) expect(layout.track).toBe('hidden');
        const calls = farm.calls;
        await win.getByRole('button', { name: /一键收获/ }).click();
        await expect(page.getByText('收获成功', { exact: true })).toBeVisible();
        await win.getByRole('button', { name: '好友', exact: true }).click();
        const social = page
          .getByRole('dialog')
          .filter({ has: page.getByRole('heading', { name: '好友农场' }) });
        await expect(page.getByRole('button', { name: '拜访', exact: true })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(win).toBeVisible();
        await expect(win.getByRole('button', { name: '好友', exact: true })).toBeFocused();
        expect(await social.count()).toBe(0);
        await win.getByRole('button', { name: '刷新', exact: true }).click();
        await expect.poll(() => farm.calls).toBeGreaterThan(calls);
        farm.status = 'error';
        await win.getByRole('button', { name: '刷新', exact: true }).click();
        await expect(win.getByRole('alert')).toContainText('HTTP 503');
        farm.status = 'empty';
        await win.getByRole('button', { name: '重新加载', exact: true }).click();
        await expect(win.getByText('暂时没有地块，请刷新同步农场。')).toBeVisible();
        farm.status = 'loading';
        await win.getByRole('button', { name: '刷新', exact: true }).click();
        await expect(page.getByRole('status').filter({ hasText: '正在同步田地…' })).toBeVisible();
        farm.status = 'ready';
        await expect(win.getByRole('button', { name: /^1号地/ })).toBeVisible();
        const before = farm.calls;
        await page.evaluate(async () => {
          const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
          const state = useAppearanceStore.getState();
          state.setSkinId(state.skinId === 'wps' ? 'wechat' : 'wps');
          state.setColorMode(state.colorMode === 'dark' ? 'light' : 'dark');
        });
        expect(farm.calls).toBe(before);
        await page.evaluate(
          async ({ skin, mode }) => {
            const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
            useAppearanceStore.getState().setSkinId(skin as never);
            useAppearanceStore.getState().setColorMode(mode as never);
          },
          { skin: skin.id, mode },
        );
        if (width > 760) {
          const title = win.getByRole('button', { name: '拖动摸鱼农场窗口' });
          const box = (await title.boundingBox())!;
          await page.mouse.move(box.x + 20, box.y + 20);
          await page.mouse.down();
          await page.mouse.move(box.x + 120, box.y + 60);
          await page.mouse.up();
          expect((await win.boundingBox())!.x).toBeGreaterThan(80);
          await win.getByRole('button', { name: '调整游戏窗口大小' }).press('ArrowLeft');
          await win.getByRole('button', { name: '最大化游戏窗口' }).click();
          expect((await win.boundingBox())!.width).toBe(width - 16);
          await win.getByRole('button', { name: '还原游戏窗口' }).click();
        }
        await win.getByRole('button', { name: '收起游戏窗口' }).click();
        win = await play('摸鱼股市');
        await expect(win.getByRole('button', { name: '查看 上证指数 详情' })).toBeVisible();
        await win.getByRole('button', { name: '查看 上证指数 详情' }).click();
        await expect(win.getByRole('button', { name: '返回股市', exact: true })).toBeVisible();
        await win.getByRole('button', { name: '返回股市', exact: true }).click();
        stock.quote = 'error';
        await win.getByRole('button', { name: '刷新数据' }).click();
        await expect(win.getByRole('button', { name: '重试行情' })).toBeVisible();
        stock.quote = 'empty';
        await win.getByRole('button', { name: '重试行情' }).click();
        await expect(win.getByText('暂无市场行情，请稍后刷新。')).toBeVisible();
        stock.quote = 'ready';
        await win.getByRole('button', { name: '刷新数据' }).click();
        await win.getByRole('button', { name: '买入 上证指数', exact: true }).click();
        await page.getByLabel('买入积分', { exact: true }).fill('200');
        await page.keyboard.press('Escape');
        await expect(win).toBeVisible();
        const content = win.getByRole('region', { name: '摸鱼股市内容' });
        await content.focus();
        await content.press('End');
        await expect.poll(() => content.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
        await content.press('Home');
        await expect.poll(() => content.evaluate((e) => e.scrollTop)).toBe(0);
        expect(await content.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
        if (skin.id === 'wechat')
          await page.screenshot({ path: info.outputPath(`stock-${width}-${mode}.png`) });
        await win.getByRole('button', { name: '关闭游戏窗口' }).click();
        await expect(page.getByRole('button', { name: '独立窗口打开摸鱼股市' })).toBeFocused();
        await page.getByRole('button', { name: '继续人生重开模拟器' }).click();
        await expect(page.getByRole('heading', { name: '选择重开模式' })).toBeVisible();
        await page.keyboard.press('Escape');
        await page
          .getByRole('link', { name: width <= 760 ? '返回发现' : '阅读', exact: true })
          .click();
        await page.getByRole('button', { name: '继续人生重开模拟器' }).click();
        await expect(page.getByRole('heading', { name: '选择重开模式' })).toBeVisible();
        await page.getByRole('button', { name: '关闭游戏窗口' }).click();
        for (const [path, name] of [
          ['/game/farm', '摸鱼农场'],
          ['/game/life', '人生重开模拟器'],
          ['/game/stock', '摸鱼股市'],
        ]) {
          await page.goto(path);
          const launcher = page.getByRole('button', { name: `独立窗口打开${name}`, exact: true });
          await expect(launcher).toBeInViewport({ timeout: 30000 });
          await expect(launcher).toHaveText('');
          if (width <= 760) await launcher.tap();
          else await launcher.press('Enter');
          const dialog = page.getByRole('dialog', { name, exact: true });
          await expect(dialog).toBeVisible();
          await dialog.getByRole('button', { name: '关闭游戏窗口' }).click();
          await expect(launcher).toBeFocused();
          const back = page.getByRole('link', { name: '返回游戏', exact: true });
          await expect(back).toBeInViewport();
          await expect(back).toHaveText('');
          await expect(back).toHaveAttribute('title', '返回游戏');
          const backBox = (await back.boundingBox())!;
          expect(backBox.width).toBeGreaterThanOrEqual(44);
          expect(backBox.height).toBeGreaterThanOrEqual(44);
          await back.focus();
          await expect(back).toBeFocused();
          if (skin.id === 'wechat')
            await page.screenshot({ path: info.outputPath(`header-${name}-${width}-${mode}.png`) });
          if (width <= 760) await back.tap();
          else await back.press('Enter');
          await expect(page).toHaveURL('/discover/games');
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      });

for (const width of [1440, 375, 390])
  test(`anonymous ${width} 登录与恢复窗口`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/api/**', (route) => route.abort());
    await page.goto('/discover/games');
    const launch = page.getByRole('button', { name: '独立窗口打开摸鱼农场' });
    await launch.click();
    const game = page.getByRole('dialog', { name: '摸鱼农场', exact: true });
    await game.getByRole('button', { name: '登录后继续' }).click();
    await expect(page.getByRole('textbox', { name: '账号或邮箱', exact: true })).toBeVisible();
    await expect(game).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL('/discover/games');
    await expect(game).toBeVisible();
    await game.getByRole('button', { name: '关闭游戏窗口' }).click();
    await expect(launch).toBeFocused();
  });

test.describe('手机触屏', () => {
  test.use({ isMobile: true });
  for (const width of [375, 390])
    test(`touch ${width} 全部主题模式滚动与交易输入`, async ({ page }) => {
      test.setTimeout(180000);
      await fixture(page);
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/discover/games');
      await page.getByRole('button', { name: '独立窗口打开摸鱼股市' }).tap();
      const win = page.getByRole('dialog', { name: '摸鱼股市', exact: true });
      const region = win.getByRole('region', { name: '摸鱼股市内容' });
      await expect(win.getByRole('button', { name: '买入 上证指数', exact: true })).toBeVisible();
      const cdp = await page.context().newCDPSession(page);
      try {
        for (const skin of builtinSkins)
          for (const mode of ['light', 'dark']) {
            await page.evaluate(
              async ({ skin, mode }) => {
                const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
                useAppearanceStore.getState().setSkinId(skin as never);
                useAppearanceStore.getState().setColorMode(mode as never);
              },
              { skin: skin.id, mode },
            );
            await region.focus();
            await region.press('Home');
            await expect.poll(() => region.evaluate((e) => e.scrollTop)).toBe(0);
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchStart',
              touchPoints: [{ x: width / 2, y: 700 }],
            });
            for (let step = 1; step <= 12; step++) {
              await cdp.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ x: width / 2, y: 700 - step * 25 }],
              });
              await page.evaluate(() => new Promise(requestAnimationFrame));
            }
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await expect.poll(() => region.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
            await win
              .getByRole('button', { name: '买入 上证指数', exact: true })
              .scrollIntoViewIfNeeded();
            await win.getByRole('button', { name: '买入 上证指数', exact: true }).tap();
            const input = page.getByLabel('买入积分', { exact: true });
            await input.fill('200');
            await expect(input).toHaveValue('200');
            await page.setViewportSize({ width, height: 500 });
            await input.focus();
            await expect(input).toBeInViewport();
            await expect(page.getByRole('button', { name: '取消', exact: true })).toBeInViewport();
            await page.keyboard.press('Escape');
            await page.setViewportSize({ width, height: 844 });
            await expect(win).toBeVisible();
            expect(await region.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
          }
      } finally {
        await cdp.detach();
      }
    });
});
