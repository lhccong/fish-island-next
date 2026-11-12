import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';

const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1872" viewBox="0 0 1536 1872">${Array.from({ length: 9 }, (_, row) => Array.from({ length: 8 }, (_, col) => `<g transform="translate(${col * 192},${row * 208})"><ellipse cx="96" cy="160" rx="50" ry="24" fill="${row === 2 ? '#7199ce' : '#cba45d'}"/><circle cx="96" cy="108" r="42" fill="${row === 2 ? '#7199ce' : '#cba45d'}"/><path d="${row === 2 ? 'M57 92 22 106 57 114' : 'M135 92 170 106 135 114'}" fill="#f2ddb4"/><circle cx="${row === 2 ? 76 : 116}" cy="98" r="5" fill="#243d35"/><path d="M70 174v15m52-15v15" stroke="#765b3d" stroke-width="8"/></g>`).join('')).join('')}</svg>`;

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: left-right sprite rows and rapid reversal`, async ({
        page,
      }, info) => {
        test.setTimeout(90000);
        await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
        const state = await setupPet(page, skin.id, mode);
        state.pet.petUrl = 'https://camp.test/moyu/pet/direction.webp';
        await page.route('https://camp.test/moyu/pet/direction.webp', (route) =>
          route.fulfill({ contentType: 'image/svg+xml', body: sheet }),
        );
        await page.reload();
        const actor = page.getByTestId('camp-actor');
        const sprite = actor.locator('[data-action]');
        const ground = page.getByRole('button', { name: /移动伙伴/ });
        await expect(sprite).toHaveAttribute('data-action', 'idle');
        await expect(sprite.locator('img')).toHaveJSProperty('naturalWidth', 1536);
        await ground.focus();
        await page.clock.install({ time: new Date('2026-11-12T00:00:00Z') });
        await page.clock.pauseAt(new Date('2026-11-12T00:00:01Z'));
        await ground.press('ArrowLeft');
        await expect(sprite).toHaveAttribute('data-action', 'run-left');
        expect(
          await sprite.locator('img').evaluate((img) => parseFloat(getComputedStyle(img).top)),
        ).toBeCloseTo((-2 * 104 * 208) / 192, 1);
        await page.screenshot({ path: info.outputPath('left.png'), fullPage: true });
        await ground.press('ArrowRight');
        await expect(sprite).toHaveAttribute('data-action', 'run');
        expect(
          await sprite.locator('img').evaluate((img) => parseFloat(getComputedStyle(img).top)),
        ).toBeCloseTo((-104 * 208) / 192, 1);
        await page.screenshot({ path: info.outputPath('right.png'), fullPage: true });
        await ground.press('ArrowLeft');
        await expect(sprite).toHaveAttribute('data-action', 'run-left');
        await page.clock.runFor(700);
        await expect(sprite).toHaveAttribute('data-action', 'idle');
        if (width <= 760) {
          const bounds = (await ground.boundingBox())!;
          await page.touchscreen.tap(
            bounds.x + bounds.width * 0.75,
            bounds.y + bounds.height * 0.6,
          );
          await expect(sprite).toHaveAttribute('data-action', 'run');
          await page.touchscreen.tap(
            bounds.x + bounds.width * 0.25,
            bounds.y + bounds.height * 0.6,
          );
          await expect(sprite).toHaveAttribute('data-action', 'run-left');
        }
      });
    }
