import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';

const assets = [
  { file: 'wutiaowu.webp', leftRow: 1, rightRow: 2 },
  { file: 'luobo.webp', leftRow: 2, rightRow: 1 },
] as const;
async function point(page: Page) {
  return page.getByTestId('camp-actor').evaluate((element) => ({
    x: parseFloat(element.style.left),
    y: parseFloat(element.style.top),
  }));
}
for (const asset of assets)
  for (const skin of builtinSkins)
    for (const mode of ['light', 'dark'])
      for (const width of [1440, 375, 390]) {
        test(`${asset.file} ${skin.id} ${mode} ${width}: actual resource, WASD and rendered direction`, async ({
          page,
        }, info) => {
          test.setTimeout(120000);
          await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
          const state = await setupPet(page, skin.id, mode);
          state.pet.petUrl = `https://camp.test/assets/${asset.file}`;
          await page.route(state.pet.petUrl, (route) =>
            route.fulfill({
              contentType: 'image/webp',
              body: readFileSync(new URL(`../fixtures/pet/${asset.file}`, import.meta.url)),
            }),
          );
          await page.reload();
          await expect(page.getByRole('heading', { name: '伙伴营地', exact: true })).toBeVisible({
            timeout: 90000,
          });
          const actor = page.getByTestId('camp-actor');
          const sprite = actor.locator('[data-action]');
          const ground = page.getByRole('button', { name: /移动伙伴/ });
          await expect(sprite).toHaveAttribute('data-layout', 'sheet');
          await expect(sprite.locator('img')).toHaveJSProperty('naturalWidth', 1536);
          await ground.focus();
          await page.clock.install({ time: new Date('2026-11-12T00:00:00Z') });
          await page.clock.pauseAt(new Date('2026-11-12T00:00:01Z'));
          const initial = await point(page);
          await page.keyboard.down('a');
          await page.clock.runFor(120);
          await expect(sprite).toHaveAttribute('data-action', 'run-left');
          expect((await point(page)).x).toBeLessThan(initial.x);
          expect(
            await sprite.locator('img').evaluate((img) => parseFloat(getComputedStyle(img).top)),
          ).toBeCloseTo((-asset.leftRow * 104 * 208) / 192, 1);
          await page.screenshot({ path: info.outputPath('actual-left.png'), fullPage: true });
          await page.keyboard.up('a');
          await expect(sprite).toHaveAttribute('data-action', 'idle');
          const left = await point(page);
          await page.keyboard.down('d');
          await page.clock.runFor(120);
          await expect(sprite).toHaveAttribute('data-action', 'run');
          expect((await point(page)).x).toBeGreaterThan(left.x);
          expect(
            await sprite.locator('img').evaluate((img) => parseFloat(getComputedStyle(img).top)),
          ).toBeCloseTo((-asset.rightRow * 104 * 208) / 192, 1);
          await page.screenshot({ path: info.outputPath('actual-right.png'), fullPage: true });
          await page.keyboard.up('d');
          for (const [key, axis, sign] of [
            ['w', 'y', -1],
            ['s', 'y', 1],
            ['ArrowLeft', 'x', -1],
            ['ArrowRight', 'x', 1],
            ['ArrowUp', 'y', -1],
            ['ArrowDown', 'y', 1],
          ] as const) {
            const before = await point(page);
            await page.keyboard.down(key);
            await page.clock.runFor(100);
            await page.keyboard.up(key);
            expect(((await point(page))[axis] - before[axis]) * sign).toBeGreaterThan(0);
          }
          const stopped = await point(page);
          await page.clock.runFor(500);
          expect(await point(page)).toEqual(stopped);
          const bounds = (await ground.boundingBox())!;
          async function clickAt(x: number) {
            const px = bounds.x + bounds.width * x;
            const py = bounds.y + bounds.height * 0.6;
            if (width <= 760) await page.touchscreen.tap(px, py);
            else await page.mouse.click(px, py);
            await page.clock.runFor(100);
          }
          await clickAt(0.8);
          await expect(sprite).toHaveAttribute('data-action', 'run');
          await clickAt(0.65);
          await expect(sprite).toHaveAttribute('data-action', 'run');
          await clickAt(0.2);
          await expect(sprite).toHaveAttribute('data-action', 'run-left');
          await page.clock.runFor(3000);
          await expect(sprite).toHaveAttribute('data-action', 'idle');
          await page.keyboard.down('d');
          await page.clock.runFor(100);
          await page.evaluate(() => window.dispatchEvent(new Event('blur')));
          const blurred = await point(page);
          await page.clock.runFor(500);
          expect(await point(page)).toEqual(blurred);
          await page.keyboard.up('d');
          await page.clock.resume();
          await page.getByRole('button', { name: /^伙伴档案/ }).click();
          const dialog = page.getByRole('dialog', { name: '伙伴档案', exact: true });
          const input = dialog.getByRole('textbox', { name: '伙伴名字' });
          await input.fill('');
          await input.pressSequentially('wasdWASD');
          await expect(input).toHaveValue('wasdWASD');
          expect(await point(page)).toEqual(blurred);
          await dialog.getByRole('button', { name: '关闭面板', exact: true }).click();
          await expect(page.getByRole('button', { name: /^伙伴档案/ })).toBeFocused();
          const afterDialog = await point(page);
          await page.keyboard.down('a');
          await expect.poll(async () => (await point(page)).x).toBeLessThan(afterDialog.x);
          await page.keyboard.up('a');
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
        });
      }
