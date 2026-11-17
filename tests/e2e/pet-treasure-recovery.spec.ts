import { expect, test } from '@playwright/test';
import { setupPet } from './pet-fixture';
import { builtinSkins } from '../../src/skins/builtin';

test('lost start, page reload, hourly refresh and reduced motion preserve one reward', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setupPet(page, 'pixel-island', 'dark');
  const t = state.treasure;
  t.failFinish = true;
  const status = page.getByRole('region', { name: '营地挖宝', exact: true });
  t.loseStart = true;
  await page.getByRole('button', { name: '溪畔挖宝' }).tap();
  await expect(status.getByRole('alert')).toBeVisible();
  expect(t.used).toBe(1);
  const id = t.active!.id;
  await page.reload();
  await expect(status.getByRole('progressbar')).toBeVisible();
  expect(t.active!.id).toBe(id);
  t.failFinish = false;
  await page.reload();
  await expect(status).toContainText('已到账', { timeout: 10000 });
  expect(t.credits).toBe(1);
  await page.reload();
  await expect(status).toContainText('距下次刷新');
  expect(t.starts).toBe(1);
  expect(t.credits).toBe(1);
  t.offset += 3601000;
  await page.reload();
  await expect(page.getByRole('button', { name: '花丛挖宝' })).toBeEnabled();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: '花丛挖宝' }).tap();
  await expect(status.getByRole('progressbar')).toBeVisible();
  expect(t.active!.siteId).toBe('flowers');
  const animations = await page
    .getByRole('region', { name: '伙伴营地场景' })
    .evaluate((el) =>
      [...el.querySelectorAll('[aria-hidden="true"] svg')].map(
        (svg) => getComputedStyle(svg).animationName,
      ),
    );
  expect(animations.every((name) => name === 'none')).toBe(true);
  await expect(status).toContainText('已到账', { timeout: 10000 });
  expect(t.credits).toBe(2);
});

test('theme and mode changes keep active dig, location and requests', async ({ page }) => {
  const state = await setupPet(page, 'wechat', 'light');
  state.treasure.failFinish = true;
  const status = page.getByRole('region', { name: '营地挖宝', exact: true });
  await page.getByRole('button', { name: '空地挖宝' }).click();
  await expect(status.getByRole('progressbar')).toBeVisible();
  const reads = state.treasure.reads;
  const id = state.treasure.active!.id;
  const actor = page.getByTestId('camp-actor');
  const position = await actor.evaluate((el) => [el.style.left, el.style.top]);
  await page.getByRole('button', { name: '切换主题', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '主题模式' });
  for (const skin of builtinSkins) {
    await dialog.getByRole('button', { name: skin.name, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
    for (const mode of ['暗夜模式', '明亮模式']) {
      await dialog.getByRole('button', { name: mode, exact: true }).click();
      expect(state.treasure.active!.id).toBe(id);
      expect(state.treasure.reads).toBe(reads);
      expect(await actor.evaluate((el) => [el.style.left, el.style.top])).toEqual(position);
    }
  }
  await page.keyboard.press('Escape');
  expect(state.treasure.reads).toBe(reads);
  expect(state.treasure.active?.id ?? state.treasure.lastReward?.id).toBe(id);
  await expect(status.getByRole('alert')).toBeVisible({ timeout: 10000 });
  state.treasure.failFinish = false;
  await status.getByRole('button', { name: '重试挖宝状态' }).click();
  await expect(status).toContainText('已到账', { timeout: 10000 });
  expect(state.treasure.credits).toBe(1);
  await page.keyboard.down('a');
  await expect(actor).toHaveAttribute('data-moving', 'true');
  await expect.poll(() => actor.evaluate((el) => parseFloat(el.style.left))).toBeLessThan(54);
  await page.keyboard.up('a');
  await expect(actor).toHaveAttribute('data-moving', 'false');
});

test('hourly refresh runs at the boundary and ignores changes to the client wall clock', async ({
  page,
}) => {
  await page.clock.install();
  const state = await setupPet(page, 'wps', 'dark');
  const t = state.treasure;
  const status = page.getByRole('region', { name: '营地挖宝', exact: true });
  const button = page.getByRole('button', { name: '小径挖宝' });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(status.getByRole('progressbar')).toBeVisible();
  t.offset += 5000;
  await page.clock.fastForward(5100);
  await expect(status).toContainText('已到账');
  const reads = t.reads;
  await page.clock.setSystemTime(new Date('2040-01-01T00:00:00Z'));
  await expect(button).toBeDisabled();
  expect(t.reads).toBe(reads);
  t.offset += 3600000;
  await page.clock.fastForward(3601000);
  await expect(button).toBeEnabled();
  expect(t.reads).toBeGreaterThan(reads);
  expect(t.credits).toBe(1);
});
