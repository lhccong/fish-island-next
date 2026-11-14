import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

test.use({ hasTouch: true });
test.setTimeout(60_000);

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1920, 375, 390])
      test(`${skin.id} ${mode} ${width}: catalog fills the workspace and keeps games reachable`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript(
          ({ skinId, colorMode }) => {
            localStorage.setItem('fish-island:skin', skinId);
            localStorage.setItem('fish-island:color-mode', colorMode);
            for (const game of ['farm', 'life', 'stock', 'gomoku', 'undercover'])
              localStorage.removeItem(`fish-island:recent-${game}`);
          },
          { skinId: skin.id, colorMode: mode },
        );
        await page.route('**/api/**', (route) => route.abort());
        await page.goto('/discover/games');
        await expect(page.getByText('玩过的游戏会留在这里，方便下次找到。')).toBeVisible({
          timeout: 15_000,
        });
        const cards = page.getByRole('button', { name: /^打开/ });
        await expect(page.getByRole('button', { name: '打开五子棋', exact: true })).toBeVisible();
        const boxes = await cards.evaluateAll((elements) =>
          elements.map((element) => {
            const { x, y, width, height } = element.getBoundingClientRect();
            return { x, y, width, height };
          }),
        );
        for (const box of boxes) {
          expect(box.width).toBeGreaterThan(300);
          expect(box.x).toBeGreaterThanOrEqual(4);
          expect(box.x + box.width).toBeLessThanOrEqual(width - 4);
        }
        expect(boxes.length).toBeGreaterThanOrEqual(4);
        if (width > 760) {
          const firstRow = boxes.filter((box) => Math.abs(box.y - boxes[0].y) < 1);
          expect(firstRow.length).toBeGreaterThan(1);
          for (const box of firstRow) {
            expect(Math.abs(box.width - firstRow[0].width)).toBeLessThan(1);
            expect(Math.abs(box.height - firstRow[0].height)).toBeLessThan(1);
          }
          expect(firstRow.at(-1)!.x + firstRow.at(-1)!.width).toBeGreaterThan(width - 60);
        } else {
          for (let i = 1; i < boxes.length; i++)
            expect(boxes[i].y).toBeGreaterThan(boxes[i - 1].y + boxes[i - 1].height);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await page.screenshot({ path: info.outputPath('catalog-top.png') });
        const stock = page.getByRole('button', { name: '打开摸鱼股市', exact: true });
        await stock.scrollIntoViewIfNeeded();
        await expect(stock).toBeInViewport();
        await stock.focus();
        await expect(stock).toBeFocused();
        await page.screenshot({ path: info.outputPath('catalog-bottom.png') });
        const life = page.getByRole('button', { name: '打开人生重开模拟器', exact: true });
        if (width <= 760) await life.tap();
        else await life.press('Enter');
        await expect(page).toHaveURL('/game/life');
        await page.getByRole('link', { name: '返回游戏', exact: true }).click();
        await expect(page.getByRole('button', { name: '人生重开模拟器 再玩一次' })).toBeVisible();
        await page.screenshot({ path: info.outputPath('catalog-recent.png') });
        // 内层手机页只保留返回入口；切到桌面宽度检查同一实例的主题切换。
        if (width <= 760) await page.setViewportSize({ width: 1440, height: 900 });
        const themeButton = page.getByRole('button', { name: '切换主题', exact: true });
        await themeButton.click();
        const dialog = page.getByRole('dialog', { name: '主题模式' });
        await dialog
          .getByRole('button', { name: skin.id === 'wps' ? '微信绿' : 'WPS 表格', exact: true })
          .click();
        await dialog.getByRole('button', { name: skin.name, exact: true }).click();
        await dialog.getByRole('button', { name: '关闭', exact: true }).click();
        if (width <= 760) await page.setViewportSize({ width, height: 900 });
        await expect(page.getByRole('button', { name: '人生重开模拟器 再玩一次' })).toBeVisible();
      });
